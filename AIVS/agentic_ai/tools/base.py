class BaseTool:
    name = "base"
    description = ""

    def __init__(self, datasource):
        self.datasource = datasource

    def run(self, **kwargs):
        raise NotImplementedError



