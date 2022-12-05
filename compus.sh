echo Commiting as $(date '+%F %H:%M:%S') autocommit
git commit -a -m "$(date '+%F %H:%M:%S') autocommit" &> /dev/null
echo Commited
git push &> /dev/null
echo Pushed
echo Done

