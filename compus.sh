echo Commiting as $(date '+%F %H:%M:%S') autocommit
git add -A * &> /dev/null
git commit -m "$(date '+%F %H:%M:%S') autocommit" &> /dev/null
echo Commited
git push &> /dev/null
echo Pushed
echo Done

