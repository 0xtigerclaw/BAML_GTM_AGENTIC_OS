on run
	set projectDir to "/Users/swayam/clawd/mission-control"
	set homeDir to POSIX path of (path to home folder)
	set logFile to homeDir & "mission_control_stop_app.log"
	set shellPath to system attribute "SHELL"
	if shellPath is "" then set shellPath to "/bin/zsh"
	
	set profilePath to ""
	if shellPath ends with "/zsh" then
		set profilePath to homeDir & ".zshrc"
	else if shellPath ends with "/bash" then
		set profilePath to homeDir & ".bash_profile"
	end if
	
	if profilePath is not "" then
		set stopStep to quoted form of shellPath & " -ic " & quoted form of ("source " & quoted form of profilePath & "; ./start.sh stop")
	else
		set stopStep to "./start.sh stop"
	end if
	
	set commandText to "cd " & quoted form of projectDir & " && { echo '== Mission Control stop app at '$(date)' =='; echo 'Project: " & projectDir & "'; " & stopStep & "; } >> " & quoted form of logFile & " 2>&1"
	
	try
		do shell script commandText
		display notification "Mission Control stopped." with title "Mission Control"
	on error errMsg number errNum
		display dialog "Mission Control failed to stop. Check ~/mission_control_stop_app.log." & return & return & errMsg buttons {"OK"} default button "OK" with title "Mission Control"
		error number errNum
	end try
end run
