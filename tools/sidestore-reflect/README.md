# sidestore-reflect

Lets SideStore refresh over Tailscale instead of LocalDevVPN. Runs on **raygun** (Raspberry Pi, Debian 12). Setup notes and phone settings: [docs/IOS_SIDELOADING.md](../../docs/IOS_SIDELOADING.md#refreshing-over-tailscale-instead-of-localdevvpn).

Install or update on raygun:

```sh
scp tools/sidestore-reflect/sidestore-reflect.{c,service} raygun:/tmp/
ssh raygun 'gcc -O2 -Wall -o /tmp/sidestore-reflect /tmp/sidestore-reflect.c &&
  sudo install -m755 /tmp/sidestore-reflect /usr/local/bin/ &&
  sudo install -m644 /tmp/sidestore-reflect.service /etc/systemd/system/ &&
  echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/90-sidestore-reflect.conf &&
  sudo systemctl daemon-reload && sudo systemctl enable --now sidestore-reflect &&
  sudo systemctl restart sidestore-reflect &&
  sudo tailscale set --advertise-routes=10.7.0.1/32 --snat-subnet-routes=false'
```

Check: `ssh raygun 'systemctl status sidestore-reflect; ping -c1 10.7.0.1'` (the ping is reflected back to raygun itself, so it answers if the reflector works).

`--advertise-routes` replaces raygun's advertised routes; if raygun later advertises others, list them all in one comma-separated value. `--snat-subnet-routes=false` applies to every route raygun advertises.
