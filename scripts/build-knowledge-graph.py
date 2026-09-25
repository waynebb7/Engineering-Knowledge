#!/usr/bin/env python3
"""Build the additive knowledge graph from existing lessons and relationships.

Run after refreshing the catalog and prerequisite maps. No source lesson or
prerequisite data is changed. --check validates inputs and generated-file drift.
"""

from __future__ import annotations

import argparse
import json
import posixpath
import sys
from collections import Counter
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "maps" / "knowledge-graph.json"
CATALOG = "assets/js/topic-catalog.json"
MAPPINGS = "maps/prereq-node-pages.json"
MAPS = {category: f"maps/{category}-topics.json" for category in
        ("math", "physics", "quantum", "digital-logic")}
CATEGORIES = [
    {"id": "math", "label": "Mathematics"},
    {"id": "physics", "label": "Physics"},
    {"id": "quantum", "label": "Quantum"},
    {"id": "digital-logic", "label": "Digital logic"},
]
EDGE_TYPES = [
    {"id": "required", "label": "Prerequisite",
     "description": "Source supports target in an existing prerequisite map. These are study guides, not exam requirements."},
    {"id": "recommended", "label": "Recommended background",
     "description": "Source is recommended background for target in an existing prerequisite map."},
    {"id": "reference", "label": "Content link",
     "description": "Source lesson links to target within its teaching content. A link does not imply a prerequisite."},
]
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
EXCLUDED_CLASSES = {
    "content-nav", "content-hero", "page-hero-breadcrumb", "progression-card",
    "map-position-card", "prerequisites-card", "next-topics-card",
    "topic-progress", "site-nav", "site-header", "site-footer",
}


class ContentLinks(HTMLParser):
    """Extract teaching-body anchors, excluding navigation and generated paths."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, bool, bool]] = []
        self.hrefs: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        classes = set((attributes.get("class") or "").split())
        content = tag in {"main", "article"} or "content-body" in classes
        excluded = (
            tag in {"nav", "header", "footer", "script", "style", "template"}
            or bool(classes & EXCLUDED_CLASSES)
            or attributes.get("role") == "navigation"
        )
        if self.stack:
            content = content or self.stack[-1][1]
            excluded = excluded or self.stack[-1][2]
        if tag == "a" and content and not excluded and attributes.get("href"):
            self.hrefs.add(attributes["href"])
        if tag not in VOID_TAGS:
            self.stack.append((tag, content, excluded))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        # Tolerate unmatched closing tags in existing content without leaking a
        # navigation exclusion into the remainder of the lesson.
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                return


def read_json(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def local_link(source: str, href: str) -> str | None:
    """Resolve a lesson-relative URL without accepting external/traversal URLs."""
    parts = urlsplit(href.strip())
    if parts.scheme or parts.netloc or not parts.path:
        return None
    path = unquote(parts.path).replace("\\", "/")
    if path.startswith("/"):
        path = path.lstrip("/")
    else:
        path = posixpath.join(posixpath.dirname(source), path)
    path = posixpath.normpath(path)
    if path == ".." or path.startswith("../"):
        return None
    return path


def category_for(href: str) -> str:
    if href.startswith("learn/mathematics/digital-logic/") or href in {
        "calculators/logic/truth-table.html",
        "calculators/converters/binary-decimal-hex.html",
        "calculators/converters/twos-complement.html",
    }:
        return "digital-logic"
    for folder, category in (("mathematics", "math"), ("physics", "physics"), ("quantum", "quantum")):
        if href.startswith(f"learn/{folder}/"):
            return category
    raise ValueError(f"Unknown lesson category: {href}")


def validate_href(href: str) -> None:
    parts = urlsplit(href)
    if parts.scheme or parts.netloc or parts.query or parts.fragment or href.startswith("/") or "\\" in href:
        raise ValueError(f"Expected site-relative lesson path: {href}")
    if posixpath.normpath(href) != href or not href.startswith(("learn/", "calculators/")) or not href.endswith(".html"):
        raise ValueError(f"Invalid lesson path: {href}")
    if not (ROOT / href).is_file():
        raise ValueError(f"Missing graph lesson: {href}")


def build_graph() -> dict:
    catalog = read_json(CATALOG)
    mappings = read_json(MAPPINGS)["byNode"]
    graphs = {category: read_json(path) for category, path in MAPS.items()}
    nodes: dict[str, dict] = {}
    edge_sources: dict[tuple[str, str, str], set[str]] = {}

    def add_node(href: str, title: str, section: str = "", **extra: str) -> None:
        validate_href(href)
        if href not in nodes:
            nodes[href] = {"id": href, "title": unescape(title), "category": category_for(href),
                           "section": unescape(section), "href": href}
        for key, value in extra.items():
            if value and key not in nodes[href]:
                nodes[href][key] = unescape(value)

    # A topic can appear in more than one catalog. Its owning subject wins for
    # display metadata; its page path gives it just one stable graph identity.
    for subject in catalog["catalogs"]:
        for section in subject["sections"]:
            for topic in section["topics"]:
                href = topic["href"]
                if href not in nodes or category_for(href) == subject["id"]:
                    add_node(href, topic["title"], section["title"])
                    if category_for(href) == subject["id"]:
                        nodes[href].update(title=unescape(topic["title"]), section=unescape(section["title"]))

    mappings["digital-logic"] = {
        node["id"]: [node["lesson"]] for node in graphs["digital-logic"]["nodes"]
    }
    for node in graphs["digital-logic"]["nodes"]:
        add_node(node["lesson"], node["title"], "Digital logic", level=node["level"], domain=node["domain"])

    # Fail on absent mappings, rather than guessing by title or silently drawing
    # a partial prerequisite graph. The existing page mappings are the source.
    for category, graph in graphs.items():
        for concept in graph["nodes"]:
            hrefs = mappings[category].get(concept["id"])
            if not hrefs:
                raise ValueError(f"Unmapped prerequisite concept: {category}/{concept['id']}")
            for href in hrefs:
                add_node(href, concept["title"], "Existing subject map",
                         level=concept.get("level", ""), domain=concept.get("domain", ""))

    def add_edge(source: str, target: str, edge_type: str, provenance: str) -> None:
        if source == target:
            return  # Distinct map concepts can resolve to the same lesson.
        if source not in nodes or target not in nodes:
            raise ValueError(f"Unknown graph endpoint: {source} -> {target}")
        if edge_type not in {entry["id"] for entry in EDGE_TYPES}:
            raise ValueError(f"Unknown graph relationship type: {edge_type}")
        edge_sources.setdefault((source, target, edge_type), set()).add(provenance)

    for category, graph in graphs.items():
        for collection in ("edges", "cross_edges"):
            for edge in graph.get(collection, []):
                source_category = edge.get("subject", "math") if collection == "cross_edges" else category
                source_hrefs = mappings[source_category].get(edge["from"])
                target_hrefs = mappings[category].get(edge["to"])
                if not source_hrefs or not target_hrefs:
                    raise ValueError(f"Missing edge mapping in {MAPS[category]}: {edge}")
                provenance = f"{MAPS[category]}#{collection}:{edge['from']}->{edge['to']}"
                for source in source_hrefs:
                    for target in target_hrefs:
                        add_edge(source, target, edge.get("type", "required"), provenance)

    # Only real links between included lessons are counted. Shared categories,
    # words, layout navigation, and generated next-topic cards create no edges.
    for href in sorted(nodes):
        parser = ContentLinks()
        parser.feed((ROOT / href).read_text(encoding="utf-8"))
        parser.close()
        for raw_href in sorted(parser.hrefs):
            target = local_link(href, raw_href)
            if target in nodes:
                add_edge(href, target, "reference", href)

    edges = [{"source": source, "target": target, "type": edge_type,
              "provenance": sorted(provenance)}
             for (source, target, edge_type), provenance in sorted(edge_sources.items())]
    return {
        "meta": {
            "title": "Knowledge graph", "version": 1,
            "description": "Topic connections across mathematics, physics, quantum and digital logic.",
            "sources": [CATALOG, MAPPINGS, *MAPS.values()],
            "notes": [
                "One node represents one existing topic page. Categories use the page's subject folder; three catalogued logic calculators belong to digital logic.",
                "Prerequisite edges reuse the existing subject maps and their lesson mappings without a new content review.",
                "The existing quantum map includes catalogue-order study progression and a suggested learning backbone.",
                "Content links come from lesson bodies; navigation and generated progression cards are excluded.",
                "Relationship direction runs from background to the dependent lesson for prerequisites, and from linking lesson to linked lesson for content links.",
                "Pages with no recorded connections remain visible. No similarity or AI-inferred relationships are added.",
            ],
            "nodeCount": len(nodes), "edgeCount": len(edges),
        },
        "categories": CATEGORIES,
        "edgeTypes": EDGE_TYPES,
        "nodes": [nodes[href] for href in sorted(nodes)],
        "edges": edges,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate all sources and fail if the committed graph is stale.")
    args = parser.parse_args()
    try:
        graph = build_graph()
        serialized = json.dumps(graph, ensure_ascii=False, indent=2) + "\n"
        if args.check:
            if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != serialized:
                print("Knowledge graph is stale. Run: python scripts/build-knowledge-graph.py", file=sys.stderr)
                return 1
        else:
            OUTPUT.write_text(serialized, encoding="utf-8", newline="\n")
        counts = Counter(edge["type"] for edge in graph["edges"])
        action = "Validated" if args.check else "Built"
        print(f"{action} {OUTPUT.relative_to(ROOT)}: {len(graph['nodes'])} topics, {len(graph['edges'])} connections {dict(counts)}")
        return 0
    except (OSError, KeyError, ValueError) as error:
        print(f"Knowledge graph build failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
