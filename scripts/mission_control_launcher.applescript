on run
	set projectDir to "/Users/swayam/clawd/mission-control"
	set homeDir to POSIX path of (path to home folder)
	set logFile to homeDir & "mission_control_app.log"
	set shellPath to system attribute "SHELL"
	if shellPath is "" then set shellPath to "/bin/zsh"
	
	set profilePath to ""
	if shellPath ends with "/zsh" then
		set profilePath to homeDir & ".zshrc"
	else if shellPath ends with "/bash" then
		set profilePath to homeDir & ".bash_profile"
	end if
	
	if profilePath is not "" then
		set appStep to quoted form of shellPath & " -ic " & quoted form of ("source " & quoted form of profilePath & "; ./start.sh toggle")
	else
		set appStep to "./start.sh toggle"
	end if
	
	set commandText to "cd " & quoted form of projectDir & " && " & appStep & " 2>&1"
	
	try
		set commandOutput to do shell script commandText
		set logEntry to "== Mission Control app toggle at " & (do shell script "date") & " ==" & linefeed & "Project: " & projectDir & linefeed & commandOutput & linefeed
		do shell script "/usr/bin/printf '%s\\n' " & quoted form of logEntry & " >> " & quoted form of logFile
		
		if commandOutput contains "__ACTION__:start" then
			display notification "Mission Control launched." with title "Mission Control"
		else if commandOutput contains "__ACTION__:stop" then
			display notification "Mission Control stopped." with title "Mission Control"
		else
			display notification "Mission Control toggled." with title "Mission Control"
		end if
	on error errMsg number errNum
		set errorEntry to "== Mission Control app toggle error at " & (do shell script "date") & " ==" & linefeed & "Project: " & projectDir & linefeed & errMsg & linefeed
		do shell script "/usr/bin/printf '%s\\n' " & quoted form of errorEntry & " >> " & quoted form of logFile
		display dialog "Mission Control failed to toggle. Check ~/mission_control_app.log." & return & return & errMsg buttons {"OK"} default button "OK" with title "Mission Control"
		error number errNum
	end try
end run
