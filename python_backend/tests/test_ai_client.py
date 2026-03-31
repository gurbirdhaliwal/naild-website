import unittest

from python_backend.ai_client import AIClientError, VertexAIGeminiClient


class VertexAIGeminiClientExtractTextTests(unittest.TestCase):
    def setUp(self):
        self.client = object.__new__(VertexAIGeminiClient)

    def test_extract_text_returns_combined_text_parts(self):
        payload = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": "Hello"},
                            {"text": " world"},
                        ]
                    }
                }
            ]
        }

        self.assertEqual(self.client._extract_text(payload), "Hello world")

    def test_extract_text_raises_when_candidates_are_missing(self):
        with self.assertRaises(AIClientError):
            self.client._extract_text({})


if __name__ == "__main__":
    unittest.main()
