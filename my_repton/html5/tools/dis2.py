from capstone import *
import struct
load=open('/tmp/load.bin','rb').read()
md=Cs(CS_ARCH_X86, CS_MODE_16)
md.detail=True

# locate interesting strings in load image
for s in [b'repmap.dat', b'pblog3.pcx', b'repton.pcx', b'repman.pcx', b'rep8pix.pcx', b'reptit.pcx', b' x %d', b'Input map filename', b'FUCKING']:
    off=load.find(s)
    print(s, hex(off) if off>=0 else None)

# data segment base: in Turbo C small model, DGROUP starts at some paragraph.
# We can find it from the startup code: entry sets up DS. Let's disasm first 100 instructions.
print("\n--- entry code ---")
code=load[0:200]
for i in md.disasm(code, 0):
    print(f"{i.address:05x}: {i.mnemonic:8} {i.op_str}")
