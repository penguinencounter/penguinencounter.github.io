import os
import sys
import shutil
import glob

copies = [
    'dist',
    'LICENSE',
    *glob.glob('*.html'),
]
deploy_to = sys.argv[1] if len(sys.argv) > 1 else 'deploy'
if os.path.exists(deploy_to):
    shutil.rmtree(deploy_to)
os.makedirs(deploy_to)

for copy in copies:
    if os.path.isdir(copy):
        shutil.copytree(copy, os.path.join(deploy_to, copy))
    else:
        shutil.copy(copy, deploy_to)
