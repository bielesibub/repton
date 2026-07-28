import struct, sys
from capstone import *

path='/Users/paulbieles/development/repton/my_repton/REPTON.EXE'
data=open(path,'rb').read()
# MZ header
e_cblp, e_cp = struct.unpack_from('<HH', data, 2)
e_cparhdr = struct.unpack_from('<H', data, 8)[0]
e_ss = struct.unpack_from('<H', data, 0x0e)[0]
e_sp = struct.unpack_from('<H', data, 0x10)[0]
e_ip = struct.unpack_from('<H', data, 0x14)[0]
e_cs = struct.unpack_from('<H', data, 0x16)[0]
hdr_size = e_cparhdr*16
file_size = (e_cp-1)*512 + e_cblp if e_cblp else e_cp*512
load = data[hdr_size:file_size]
print(f"hdr={hdr_size} file_size={file_size} load_len={len(load)} entry CS:IP={e_cs:04x}:{e_ip:04x} SS:SP={e_ss:04x}:{e_sp:04x}")
open('/tmp/load.bin','wb').write(load)

# find the symbol strings block: search for '_load_world'
for sym in [b'_load_world', b'_main', b'_draw_map', b'_move_baddie', b'_update_map', b'_check_map', b'_init_map']:
    off = data.find(sym)
    print(sym, "at file off", hex(off) if off>=0 else None)
