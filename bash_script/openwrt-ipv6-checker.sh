#!/bin/bash

# screen -dmS v6 /opt2/ipv6-check.sh

echo IPv6 Check script is online.
while true; do
    if ! ping6 -c 1 -W 1 2001:da8::666 >/dev/null; then
        echo $(date +'%Y-%m-%d %H:%M:%S') reconnecting IPv6...


        # Get traffic data TX&RX from ifconfig for eth0 interface
        eth0_data=$(ifconfig eth0 | grep -oE 'RX.*TX.*' | sed -n 's/.*RX bytes:[0-9]\+ (\([0-9.]\+ GiB\))  TX bytes:[0-9]\+ (\([0-9.]\+ GiB\)).*/RX: \1 TX: \2/p')
        # Get traffic data TX&RX from ifconfig for pppoe-wan interface
        pppoe_wan_data=$(ifconfig pppoe-wan | grep -oE 'RX.*TX.*' | sed -n 's/.*RX bytes:[0-9]\+ (\([0-9.]\+ GiB\))  TX bytes:[0-9]\+ (\([0-9.]\+ GiB\)).*/RX: \1 TX: \2/p')
        # Concatenate the two interfaces' traffic data into a single string
        all_traffic="[Current Traffic] WAN-all[${eth0_data}] WAN4[${pppoe_wan_data}]"

        echo "$all_traffic"
        echo "$all_traffic" >> /opt2/ipv6_var.log
        /sbin/ifup wan6
        sleep 8
        v6_addr=$(ifconfig | grep -oE '2001:250:[0-9a-fA-F:]+')
        curl https://bark.<redacted>/416+IPv6+Changed/$v6_addr.
        echo -ne "\n$(date +'%Y-%m-%d %H:%M:%S') $ipv6_address"
        echo -ne "\n$(date +'%Y-%m-%d %H:%M:%S') $ipv6_address" >> /opt2/ipv6_var.log
        sleep 53
    fi
    sleep 10
done

