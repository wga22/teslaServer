#!/bin/sh -e
# automated update of nhlpi
# USAGE
#		curl -sL https://raw.githubusercontent.com/wga22/teslaServer/master/misc/install_tesla.sh | sudo -E bash -
if ping -q -c 1 -W 1 google.com >/dev/null; then
	mkdir /opt/tesla
	cd /opt/tesla
	npm install teslams
	wget -O /opt/tesla/teslams.js https://raw.githubusercontent.com/wga22/teslaServer/master/teslams.js
	wget -O /opt/tesla/will_tesla.js https://raw.githubusercontent.com/wga22/teslaServer/master/will_tesla.js
	wget -O /opt/tesla/tesla_battery_levels.js https://raw.githubusercontent.com/wga22/teslaServer/master/tesla_battery_levels.js
	#mkdir /var/log/will_progs/
fi
exit 0