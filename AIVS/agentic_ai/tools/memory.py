from tools.base import BaseTool

class MemoryTool(BaseTool):
    name = "memory_tool"
    memory = {}

    def run(self, user_id, message):
        self.memory.setdefault(user_id, []).append(message)

