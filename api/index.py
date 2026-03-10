import sys
import os

# Ensure Vercel can find the backend module
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
sys.path.append(root_dir)

from backend.main import app
