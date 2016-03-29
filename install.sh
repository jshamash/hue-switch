#!/bin/bash

cat << EOF
  #!/bin/bash
  node $PWD/hue-switch.js
EOF > /usr/bin/hue-switch.sh

chmod +x /usr/bin/hue-switch.sh

cat << EOF
[Unit]
Description=Hue Switch
After=syslog.target network.target
[Service]
Type=simple
ExecStart=/usr/bin/hue-switch.sh
[Install]
WantedBy=multi-user.target
EOF > /lib/systemd/hue-switch.service

ln /lib/systemd/hue-switch.service /etc/systemd/system/hue-switch.service
systemctl daemon-reload
systemctl start hue-switch.service
systemctl enable hue-switch.service
