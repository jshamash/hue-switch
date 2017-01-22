#!/bin/bash

apt-get update
apt-get install -y libpcap-dev
npm install

cat << EOF > /usr/bin/hue-switch.sh
#!/bin/bash
export NODE_CONFIG_DIR=$PWD/config
export NODE_ENV=production
node $PWD/hue-switch.js
EOF

chmod +x /usr/bin/hue-switch.sh

cat << EOF > /lib/systemd/hue-switch.service
[Unit]
Description=Hue Switch
After=syslog.target network.target
[Service]
Type=simple
ExecStart=/usr/bin/hue-switch.sh
[Install]
WantedBy=multi-user.target
EOF

if [ -f /etc/systemd/system/hue-switch.service ]; then
    rm /etc/systemd/system/hue-switch.service
fi

ln /lib/systemd/hue-switch.service /etc/systemd/system/hue-switch.service
systemctl daemon-reload
systemctl start hue-switch.service
systemctl enable hue-switch.service
journalctl -u hue-switch -f
