// SideStore reflector: bounces IPv4 packets addressed to REFLECT back to their sender
// by swapping source and destination. Swapping doesn't change the IP, TCP or UDP
// checksums (both are sums over the same words), so nothing is recomputed.
// Based on https://github.com/xddxdd/sidestore-vpn and shiqi917/sidestore-vpn-tailscale.
#include <arpa/inet.h>
#include <fcntl.h>
#include <linux/if.h>
#include <linux/if_tun.h>
#include <stdio.h>
#include <string.h>
#include <sys/ioctl.h>
#include <unistd.h>

int main(int argc, char **argv) {
  if (argc != 3) {
    fprintf(stderr, "usage: %s <tun name> <reflect address>\n", argv[0]);
    return 2;
  }
  struct in_addr reflect;
  if (inet_pton(AF_INET, argv[2], &reflect) != 1) {
    fprintf(stderr, "bad address: %s\n", argv[2]);
    return 2;
  }
  int fd = open("/dev/net/tun", O_RDWR);
  if (fd < 0) { perror("open /dev/net/tun"); return 1; }
  struct ifreq ifr = {0};
  ifr.ifr_flags = IFF_TUN | IFF_NO_PI;
  strncpy(ifr.ifr_name, argv[1], IFNAMSIZ - 1);
  if (ioctl(fd, TUNSETIFF, &ifr) < 0) { perror("TUNSETIFF"); return 1; }
  printf("reflecting %s on %s\n", argv[2], ifr.ifr_name);
  fflush(stdout);

  unsigned char buf[65536];
  for (;;) {
    ssize_t n = read(fd, buf, sizeof buf);
    if (n < 0) { perror("read"); return 1; }
    if (n < 20 || (buf[0] >> 4) != 4) continue;
    if (memcmp(buf + 16, &reflect, 4) != 0) continue;
    unsigned char src[4];
    memcpy(src, buf + 12, 4);
    memcpy(buf + 12, buf + 16, 4);
    memcpy(buf + 16, src, 4);
    if (write(fd, buf, n) < 0) perror("write");
  }
}
