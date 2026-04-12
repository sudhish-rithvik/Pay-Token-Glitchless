try:
    from fastapi import FastAPI
    from pydantic import BaseModel
    print("Imports successful")
    app = FastAPI()
    print("App created")
except Exception as e:
    import traceback
    traceback.print_exc()
