from capstone import *
from capstone.x86 import *
import struct, pickle, sys

load=open('/tmp/load.bin','rb').read()
md=Cs(CS_ARCH_X86, CS_MODE_16)
md.detail=True

SEG2=0x9a9  # second code segment paragraph (file base 0x9a90)
def fileoff(seg, ip):
    base = 0 if seg==0 else seg*16
    return base+ip

# disassemble one instruction at file offset
def insn_at(fo):
    for i in md.disasm(load[fo:fo+16], fo, count=1):
        return i
    return None

visited=set()
work=[(0,0)]  # (seg, ip) entry points; seg 0 base = file 0
results={}
tables=[]

def add_target(seg, ip):
    if ip<0 or ip>0xfff0: return
    fo=fileoff(seg,ip)
    if fo<0 or fo>=len(load): return
    if (seg,ip) not in visited:
        work.append((seg,ip))

while work:
    seg,ip=work.pop()
    fo=fileoff(seg,ip)
    if (seg,ip) in visited: continue
    # walk a basic block
    while True:
        if (seg,ip) in visited: break
        if fo<0 or fo>=len(load)-1: break
        i=insn_at(fo)
        if i is None: break
        visited.add((seg,ip))
        results[fo]=i
        mn=i.mnemonic; ops=i.operands
        nfo=fo+i.size
        nip=ip+i.size
        # debug: print suspicious
        if mn.startswith('jmp') and len(ops)==1 and ops[0].type==CS_OP_MEM:
            mem=ops[0].mem
            if mem.segment==X86_REG_CS and mem.base==X86_REG_BX and mem.index==0 and ops[0].size==2:
                # jump table at cs:[bx+disp]
                tbase=fileoff(seg, mem.disp)
                # read up to 32 entries; keep plausible code targets
                entries=[]
                for k in range(40):
                    w=struct.unpack_from('<H',load,tbase+k*2)[0]
                    # plausible if within image code
                    if fileoff(seg,w) < len(load) and w<0xff00:
                        entries.append(w)
                tables.append((fo,mem.disp,entries))
                for w in entries[:26]:
                    add_target(seg,w)
                break  # end of block
        if mn=='jmp':
            op=ops[0]
            if op.type==CS_OP_IMM:
                add_target(seg, op.imm & 0xffff)
                break
            elif op.type==CS_OP_MEM:
                break
        elif mn.startswith('j') and mn!='jmp' and len(ops)==1 and ops[0].type==CS_OP_IMM:
            add_target(seg, ops[0].imm & 0xffff)  # branch target
            # fall through
            ip=nip; fo=nfo; continue
        elif mn in ('call',):
            if ops[0].type==CS_OP_IMM:
                add_target(seg, ops[0].imm & 0xffff)
            ip=nip; fo=nfo; continue
        elif mn=='lcall':
            if ops[0].type==CS_OP_IMM:
                tseg=ops[1].imm if len(ops)>1 else 0
                toff=ops[0].imm & 0xffff
                add_target(tseg, toff)
            ip=nip; fo=nfo; continue
        elif mn in ('ret','retf','iret'):
            break
        else:
            ip=nip; fo=nfo; continue

print("blocks:",len(results))
for fo,disp,entries in tables:
    print(f"jmptbl insn@{fo:05x} disp=0x{disp:x} entries:", ' '.join(f'{e:04x}' for e in entries[:26]))
pickle.dump({fo:(i.mnemonic,i.op_str) for fo,i in results.items()}, open('/tmp/rdis.pkl','wb'))
