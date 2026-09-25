#!/usr/bin/env python3
"""Regression checks for graph relationship provenance and link safety."""

import importlib.util
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("knowledge_graph", Path(__file__).with_name("build-knowledge-graph.py"))
graph_builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(graph_builder)


class ContentLinkTests(unittest.TestCase):
    def test_navigation_and_generated_paths_do_not_become_relationships(self):
        parser = graph_builder.ContentLinks()
        parser.feed('''
            <header><a href="global.html">Global link</a></header>
            <div class="content-body">
              <p>Review <a href="actual.html#example">this concept</a>.</p>
              <div class="card progression-card"><div>
                <a href="generated.html">Auto-generated next topic</a>
              </div></div>
              <nav><a href="navigation.html">Navigation</a></nav>
              <aside role="navigation"><a href="sidebar.html">Sidebar</a></aside>
              <br><input value="test"><a href="after-void.html">Actual link</a>
              <script>var template = '<a href="script.html">Link</a>';</script>
              <template><a href="template.html">Hidden template</a></template>
            </div>
            <footer><a href="footer.html">Footer</a></footer>
        ''')
        self.assertEqual(parser.hrefs, {"actual.html#example", "after-void.html"})

    def test_link_resolution_ignores_external_urls_and_root_escape(self):
        source = "learn/quantum/topics/quantum-gates.html"
        self.assertEqual(
            graph_builder.local_link(source, "../../mathematics/a-level/matrices.html?from=quantum#example"),
            "learn/mathematics/a-level/matrices.html",
        )
        for href in ("https://example.com/x.html", "//example.com/x.html", "javascript:alert(1)",
                     "#local-anchor", "../../../../outside.html", "%2E%2E/%2E%2E/%2E%2E/%2E%2E/outside.html"):
            with self.subTest(href=href):
                self.assertIsNone(graph_builder.local_link(source, href))


class GeneratedGraphTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.graph = graph_builder.build_graph()
        cls.nodes = {node["id"]: node for node in cls.graph["nodes"]}
        cls.edges = {(edge["source"], edge["target"], edge["type"]): edge for edge in cls.graph["edges"]}

    def test_all_connections_have_valid_distinct_endpoints_and_sources(self):
        self.assertEqual(len(self.nodes), len(self.graph["nodes"]))
        self.assertEqual(len(self.edges), len(self.graph["edges"]))
        for edge in self.graph["edges"]:
            self.assertIn(edge["source"], self.nodes)
            self.assertIn(edge["target"], self.nodes)
            self.assertNotEqual(edge["source"], edge["target"])
            self.assertTrue(edge["provenance"])
            for provenance in edge["provenance"]:
                self.assertTrue((graph_builder.ROOT / provenance.split("#")[0]).is_file())
        for node in self.nodes.values():
            self.assertEqual(node["id"], node["href"])
            self.assertTrue((graph_builder.ROOT / node["href"]).is_file())

    def test_cross_subject_prerequisite_keeps_direction_and_content_link_is_separate(self):
        matrices = "learn/mathematics/a-level/matrices.html"
        gates = "learn/quantum/topics/quantum-gates.html"
        self.assertEqual(self.nodes[matrices]["category"], "math")
        self.assertEqual(self.nodes[gates]["category"], "quantum")
        self.assertIn((matrices, gates, "required"), self.edges)
        self.assertIn((gates, matrices, "reference"), self.edges)

    def test_catalog_duplicates_merge_and_digital_logic_is_included(self):
        self.assertEqual(self.nodes["learn/physics/a-level/quantum-mechanics-1.html"]["category"], "physics")
        self.assertEqual(self.nodes["learn/mathematics/digital-logic/truth-tables.html"]["category"], "digital-logic")
        self.assertEqual(self.nodes["calculators/logic/truth-table.html"]["category"], "digital-logic")

    def test_titles_and_sections_are_readable_text(self):
        self.assertEqual(self.nodes["calculators/converters/twos-complement.html"]["title"], "2\u2019s complement converter")
        self.assertEqual(self.nodes["learn/quantum/topics/quantum-error-correction.html"]["section"],
                         "Error Correction & Fault Tolerance")
        for node in self.nodes.values():
            for field in ("title", "section"):
                self.assertNotRegex(node[field], r"&(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);")


if __name__ == "__main__":
    unittest.main()
