from tools.base import BaseTool

class GuardrailTool(BaseTool):
    name = "guardrail"

    def run(self, response):
        if "hack" in response.lower():
            return {"safe": False}
        return {"safe": True}

