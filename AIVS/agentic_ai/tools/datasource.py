# !pip install pymongo

import pandas as pd
from pymongo import MongoClient

class DataSource:
    def __init__(self, source_type, csv_path=None,
                 mongo_uri=None, mongo_db=None, mongo_collection=None):
        self.source_type = source_type
        self.csv_path = csv_path
        self.mongo_uri = mongo_uri
        self.mongo_db = mongo_db
        self.mongo_collection = mongo_collection
        self._init()

    def _init(self):
        if self.source_type == "csv":
            self.df = pd.read_csv(self.csv_path).fillna("")
        else:
            self.client = MongoClient(self.mongo_uri)
            self.col = self.client[self.mongo_db][self.mongo_collection]

    def fetch_all(self):
        if self.source_type == "csv":
            return self.df.copy()
        return pd.DataFrame(list(self.col.find({}, {"_id": 0})))



