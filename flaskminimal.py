from flask import Flask

app = Flask(__name__, static_folder="./deploy/", static_url_path="")
app.run(port=8000, host="0.0.0.0", debug=True)
