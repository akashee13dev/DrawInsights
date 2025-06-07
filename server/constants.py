from dotenv import load_dotenv
import os
load_dotenv()
SERVER_URL = 'localhost'
PORT = '8900'
ENV = 'dev'
GEMNI_API_KEY= os.getenv('GEMNI_API_KEY')