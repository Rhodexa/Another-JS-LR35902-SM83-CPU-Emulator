//  / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / 
// <   LR35902 CPU   >
//  / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / / */
class SM83 {
    constructor() {        
        this.reg = {
            TT: [0x00, 0x00],
            TA: [0x00, 0x00],
            BC: [0x00, 0x00],
            DE: [0x00, 0x00],
            HL: [0x00, 0x00],
            SP: 0x0000, PC: 0x0000,
            IF: 0x00, IE: 0x00, IME: 0,
            F: 0x00
        };
        this.opcode = 0x00;
        this.condition_was_false = 0;
        this.instruction_elapsed_cycles = 0;
        this.instruction_cycle_count = 0;
        this.read_cycle = 0;
        this.write_cycle = 0;
        this.write_queue = [0x0000, 0x00, 0x0000, 0x00];
        this.write_queue_length = 0;
        this.halted = false;
        this.interrupt_bits = {
            VBLANK: 0x01,
            STAT: 0x02,
            TIMER: 0x04,
            SERIAL: 0x08,
            JOYPAD: 0x10
        };
        this.interrupt_addresses = [0x0040, 0x0048, 0x0050, 0x0058, 0x0060];


        this.opcodeTable = [
            /* B T1 T2  Z N H C OPCODE OP1   OP2  */
            
            // 0x0-
            /* 1 4      - - - - NOP               */ () => { ; },
            /* 3 12     - - - - LD     BC, d16    */ () => { this.reg.BC[0] = this.read(this.reg.PC++); this.reg.BC[1] = this.read(this.reg.PC++); },
            /* 1 8      - - - - LD     (BC), A    */ () => { this.write(this.make16(this.reg.BC), this.reg.TA[0]); },
            /* 1 8      - - - - INC    BC         */ () => { this.inc16(this.reg.BC); },
            /* 1 4      Z 0 H - INC    B          */ () => { this.inc(this.reg.BC, 1); },
            /* 1 4      Z 1 H - DEC    B          */ () => { this.dec(this.reg.BC, 1); },
            /* 2 8      - - - - LD     B, d8      */ () => { this.reg.BC[1] = this.read(this.reg.PC++); },
            /* 1 4      0 0 0 C RLCA              */ () => { this.rlc(this.reg.TA, 0); this.setZ(0); },
            /* 3 20     - - - - LD     (a16), SP  */ () => { const addr = this.get16(); this.write(addr, this.reg.SP & 0xFF); this.write(addr + 1, (this.reg.SP & 0xFF00) >> 8); },
            /* 1 8      - 0 H C ADD    HL, BC     */ () => { this.addhl(this.reg.BC); },
            /* 1 8      - - - - LD     A, (BC)    */ () => { this.reg.TA[0] = this.read(this.make16(this.reg.BC)); },
            /* 1 8      - - - - DEC    BC         */ () => { this.dec16(this.reg.BC); },
            /* 1 4      Z 0 H - INC    C          */ () => { this.inc(this.reg.BC, 0); },
            /* 1 4      Z 1 H - DEC    C          */ () => { this.dec(this.reg.BC, 0); },
            /* 2 8      - - - - LD     C, d8      */ () => { this.reg.BC[0] = this.read(this.reg.PC++); },
            /* 1 4      0 0 0 C RRCA              */ () => { this.rrc(this.reg.TA, 0); this.setZ(0); },
            
            // 0x1-
            /* 2 4      - - - - STOP   d8         */ () => { ; },
            /* 3 12     - - - - LD     DE, d16    */ () => { this.reg.DE[0] = this.read(this.reg.PC++); this.reg.DE[1] = this.read(this.reg.PC++); },
            /* 1 8      - - - - LD     (DE), A    */ () => { this.write(this.make16(this.reg.DE), this.reg.TA[0]); },
            /* 1 8      - - - - INC    DE         */ () => { this.inc16(this.reg.DE); },
            /* 1 4      Z 0 H - INC    D          */ () => { this.inc(this.reg.DE, 1); },
            /* 1 4      Z 1 H - DEC    D          */ () => { this.dec(this.reg.DE, 1); },
            /* 2 8      - - - - LD     D, d8      */ () => { this.reg.DE[1] = this.read(this.reg.PC++); },
            /* 1 4      0 0 0 C RLA               */ () => { this.rltc(this.reg.TA, 0); this.setZ(0); },
            /* 2 12     - - - - JR     r8         */ () => { this.jumpRelative(); },
            /* 1 8      - 0 H C ADD    HL, DE     */ () => { this.addhl(this.reg.DE); },
            /* 1 8      - - - - LD     A, (DE)    */ () => { this.reg.TA[0] = this.read(this.make16(this.reg.DE)); },
            /* 1 8      - - - - DEC    DE         */ () => { this.dec16(this.reg.DE); },
            /* 1 4      Z 0 H - INC    E          */ () => { this.inc(this.reg.DE, 0); },
            /* 1 4      Z 1 H - DEC    E          */ () => { this.dec(this.reg.DE, 0); },
            /* 2 8      - - - - LD     E, d8      */ () => { this.reg.DE[0] = this.read(this.reg.PC++); },
            /* 1 4      0 0 0 C RRA               */ () => { this.rrtc(this.reg.TA, 0); this.setZ(0); },
            
            // 0x2-
            /* 2 12,8   - - - - JR     NZ, r8     */ () => { if(!this.getZ()) this.jumpRelative(); else {this.reg.PC++; this.condition_was_false = 1;} },
            /* 3 12     - - - - LD     HL, d16    */ () => { this.reg.HL[0] = this.read(this.reg.PC++);  this.reg.HL[1] = this.read(this.reg.PC++); },
            /* 1 8      - - - - LD     (HL+), A   */ () => { this.write(this.make16(this.reg.HL), this.reg.TA[0]); this.inc16(this.reg.HL)},
            /* 1 8      - - - - INC    HL         */ () => { this.inc16(this.reg.HL); },
            /* 1 4      Z 0 H - INC    H          */ () => { this.inc(this.reg.HL, 1); },
            /* 1 4      Z 1 H - DEC    H          */ () => { this.dec(this.reg.HL, 1); },
            /* 2 8      - - - - LD     H, d8      */ () => { this.reg.HL[1] = this.read(this.reg.PC++); },
            /* 1 4      Z - 0 C DAA               */ () => { this.daa(); },
            /* 2 12,8   - - - - JR     Z, r8      */ () => { if(this.getZ()) this.jumpRelative(); else {this.reg.PC++; this.condition_was_false = 1;} },
            /* 1 8      - 0 H C ADD    HL, HL     */ () => { this.addhl(this.reg.HL); },
            /* 1 8      - - - - LD     A, (HL+)   */ () => { this.reg.TA[0] = this.read(this.make16(this.reg.HL)); this.inc16(this.reg.HL); },
            /* 1 8      - - - - DEC    HL         */ () => { this.dec16(this.reg.HL); },
            /* 1 4      Z 0 H - INC    L          */ () => { this.inc(this.reg.HL, 0); },
            /* 1 4      Z 1 H - DEC    L          */ () => { this.dec(this.reg.HL, 0); },
            /* 2 8      - - - - LD     L, d8      */ () => { this.reg.HL[0] = this.read(this.reg.PC++); },
            /* 1 4      - 1 1 - CPL               */ () => { this.reg.TA[0] ^= 0xFF; this.reg.TA[0] &= 0xFF; this.setN(1); this.setH(1); },

            // 0x3-
            /* 2 12,8   - - - - JR     NC, r8     */ () => { if(!this.getC()) this.jumpRelative(); else {this.reg.PC++; this.condition_was_false = 1;} },
            /* 3 12     - - - - LD     SP, d16    */ () => { this.reg.SP = this.get16(); },
            /* 1 8      - - - - LD     (HL-), A   */ () => { this.write(this.make16(this.reg.HL), this.reg.TA[0]);  this.dec16(this.reg.HL)},
            /* 1 8      - - - - INC    SP         */ () => { this.reg.SP++; },
            /* 1 12     Z 0 H - INC    (HL)       */ () => { this.HLPointerGet();  this.inc(this.reg.TA, 1); this.HLPointerSet();  },
            /* 1 12     Z 1 H - DEC    (HL)       */ () => { this.HLPointerGet();  this.dec(this.reg.TA, 1); this.HLPointerSet();  },
            /* 2 12     - - - - LD     (HL), d8   */ () => { this.reg.TA[1] = this.read(this.reg.PC++); this.HLPointerSet();  },
            /* 1 4      - 0 0 1 SCF               */ () => { this.setC(1); this.setN(0); this.setH(0); },
            /* 2 12,8   - - - - JR     C, r8      */ () => { if(this.getC()) this.jumpRelative(); else {this.reg.PC++; this.condition_was_false = 1;} },
            /* 1 8      - 0 H C ADD    HL, SP     */ () => { const sp = [this.reg.SP & 0xFF, (this.reg.SP >> 8) & 0xFF]; this.addhl(sp); },
            /* 1 8      - - - - LD     A, (HL-)   */ () => { this.reg.TA[0] = this.read(this.make16(this.reg.HL));  this.dec16(this.reg.HL)},
            /* 1 8      - - - - DEC    SP         */ () => { this.reg.SP--; },
            /* 1 4      Z 0 H - INC    A          */ () => { this.inc(this.reg.TA, 0); },
            /* 1 4      Z 1 H - DEC    A          */ () => { this.dec(this.reg.TA, 0); },
            /* 2 8      - - - - LD     A, d8      */ () => { this.reg.TA[0] = this.read(this.reg.PC++); },
            /* 1 4      - 0 0 C CCF               */ () => { this.setC(this.getC() ^ 1); this.setN(0); this.setH(0); },

            // 0x4-
            /* 1 4      - - - - LD     B, B       */ () => { this.reg.BC[1] = this.reg.BC[1]; },
            /* 1 4      - - - - LD     B, C       */ () => { this.reg.BC[1] = this.reg.BC[0]; },
            /* 1 4      - - - - LD     B, D       */ () => { this.reg.BC[1] = this.reg.DE[1]; },
            /* 1 4      - - - - LD     B, E       */ () => { this.reg.BC[1] = this.reg.DE[0]; },
            /* 1 4      - - - - LD     B, H       */ () => { this.reg.BC[1] = this.reg.HL[1]; },
            /* 1 4      - - - - LD     B, L       */ () => { this.reg.BC[1] = this.reg.HL[0]; },
            /* 1 8      - - - - LD     B, (HL)    */ () => { this.HLPointerGet();   this.reg.BC[1] = this.reg.TA[1]; },
            /* 1 4      - - - - LD     B, A       */ () => { this.reg.BC[1] = this.reg.TA[0]; },
            /* 1 4      - - - - LD     C, B       */ () => { this.reg.BC[0] = this.reg.BC[1]; },
            /* 1 4      - - - - LD     C, C       */ () => { this.reg.BC[0] = this.reg.BC[0]; },
            /* 1 4      - - - - LD     C, D       */ () => { this.reg.BC[0] = this.reg.DE[1]; },
            /* 1 4      - - - - LD     C, E       */ () => { this.reg.BC[0] = this.reg.DE[0]; },
            /* 1 4      - - - - LD     C, H       */ () => { this.reg.BC[0] = this.reg.HL[1]; },
            /* 1 4      - - - - LD     C, L       */ () => { this.reg.BC[0] = this.reg.HL[0]; },
            /* 1 8      - - - - LD     C, (HL)    */ () => { this.HLPointerGet();   this.reg.BC[0] = this.reg.TA[1]; },
            /* 1 4      - - - - LD     C, A       */ () => { this.reg.BC[0] = this.reg.TA[0]; },

            // 0x5-
            /* 1 4      - - - - LD     D, B       */ () => { this.reg.DE[1] = this.reg.BC[1]; },
            /* 1 4      - - - - LD     D, C       */ () => { this.reg.DE[1] = this.reg.BC[0]; },
            /* 1 4      - - - - LD     D, D       */ () => { this.reg.DE[1] = this.reg.DE[1]; },
            /* 1 4      - - - - LD     D, E       */ () => { this.reg.DE[1] = this.reg.DE[0]; },
            /* 1 4      - - - - LD     D, H       */ () => { this.reg.DE[1] = this.reg.HL[1]; },
            /* 1 4      - - - - LD     D, L       */ () => { this.reg.DE[1] = this.reg.HL[0]; },
            /* 1 8      - - - - LD     D, (HL)    */ () => { this.HLPointerGet();   this.reg.DE[1] = this.reg.TA[1]; },
            /* 1 4      - - - - LD     D, A       */ () => { this.reg.DE[1] = this.reg.TA[0]; },
            /* 1 4      - - - - LD     E, B       */ () => { this.reg.DE[0] = this.reg.BC[1]; },
            /* 1 4      - - - - LD     E, C       */ () => { this.reg.DE[0] = this.reg.BC[0]; },
            /* 1 4      - - - - LD     E, D       */ () => { this.reg.DE[0] = this.reg.DE[1]; },
            /* 1 4      - - - - LD     E, E       */ () => { this.reg.DE[0] = this.reg.DE[0]; },
            /* 1 4      - - - - LD     E, H       */ () => { this.reg.DE[0] = this.reg.HL[1]; },
            /* 1 4      - - - - LD     E, L       */ () => { this.reg.DE[0] = this.reg.HL[0]; },
            /* 1 8      - - - - LD     E, (HL)    */ () => { this.HLPointerGet();   this.reg.DE[0] = this.reg.TA[1]; },
            /* 1 4      - - - - LD     E, A       */ () => { this.reg.DE[0] = this.reg.TA[0]; },

            // 0x6-
            /* 1 4      - - - - LD     H, B       */ () => { this.reg.HL[1] = this.reg.BC[1]; },
            /* 1 4      - - - - LD     H, C       */ () => { this.reg.HL[1] = this.reg.BC[0]; },
            /* 1 4      - - - - LD     H, D       */ () => { this.reg.HL[1] = this.reg.DE[1]; },
            /* 1 4      - - - - LD     H, E       */ () => { this.reg.HL[1] = this.reg.DE[0]; },
            /* 1 4      - - - - LD     H, H       */ () => { this.reg.HL[1] = this.reg.HL[1]; },
            /* 1 4      - - - - LD     H, L       */ () => { this.reg.HL[1] = this.reg.HL[0]; },
            /* 1 8      - - - - LD     H, (HL)    */ () => { this.HLPointerGet();   this.reg.HL[1] = this.reg.TA[1]; },
            /* 1 4      - - - - LD     H, A       */ () => { this.reg.HL[1] = this.reg.TA[0]; },
            /* 1 4      - - - - LD     L, B       */ () => { this.reg.HL[0] = this.reg.BC[1]; },
            /* 1 4      - - - - LD     L, C       */ () => { this.reg.HL[0] = this.reg.BC[0]; },
            /* 1 4      - - - - LD     L, D       */ () => { this.reg.HL[0] = this.reg.DE[1]; },
            /* 1 4      - - - - LD     L, E       */ () => { this.reg.HL[0] = this.reg.DE[0]; },
            /* 1 4      - - - - LD     L, H       */ () => { this.reg.HL[0] = this.reg.HL[1]; },
            /* 1 4      - - - - LD     L, L       */ () => { this.reg.HL[0] = this.reg.HL[0]; },
            /* 1 8      - - - - LD     L, (HL)    */ () => { this.HLPointerGet();   this.reg.HL[0] = this.reg.TA[1]; },
            /* 1 4      - - - - LD     L, A       */ () => { this.reg.HL[0] = this.reg.TA[0]; },

            // 0x7-
            /* 1 8      - - - - LD     (HL), B    */ () => { this.reg.TA[1] = this.reg.BC[1]; this.HLPointerSet();  },
            /* 1 8      - - - - LD     (HL), C    */ () => { this.reg.TA[1] = this.reg.BC[0]; this.HLPointerSet();  },
            /* 1 8      - - - - LD     (HL), D    */ () => { this.reg.TA[1] = this.reg.DE[1]; this.HLPointerSet();  },
            /* 1 8      - - - - LD     (HL), E    */ () => { this.reg.TA[1] = this.reg.DE[0]; this.HLPointerSet();  },
            /* 1 8      - - - - LD     (HL), H    */ () => { this.reg.TA[1] = this.reg.HL[1]; this.HLPointerSet();  },
            /* 1 8      - - - - LD     (HL), L    */ () => { this.reg.TA[1] = this.reg.HL[0]; this.HLPointerSet();  },
            /* 1 4      - - - - HALT              */ () => { this.halted = true; },
            /* 1 8      - - - - LD     (HL), A    */ () => { this.reg.TA[1] = this.reg.TA[0]; this.HLPointerSet();  },
            /* 1 4      - - - - LD     A, B       */ () => { this.reg.TA[0] = this.reg.BC[1]; },
            /* 1 4      - - - - LD     A, C       */ () => { this.reg.TA[0] = this.reg.BC[0]; },
            /* 1 4      - - - - LD     A, D       */ () => { this.reg.TA[0] = this.reg.DE[1]; },
            /* 1 4      - - - - LD     A, E       */ () => { this.reg.TA[0] = this.reg.DE[0]; },
            /* 1 4      - - - - LD     A, H       */ () => { this.reg.TA[0] = this.reg.HL[1]; },
            /* 1 4      - - - - LD     A, L       */ () => { this.reg.TA[0] = this.reg.HL[0]; },
            /* 1 8      - - - - LD     A, (HL)    */ () => { this.HLPointerGet();  this.reg.TA[0] = this.reg.TA[1]; },
            /* 1 4      - - - - LD     A, A       */ () => { this.reg.TA[0] = this.reg.TA[0]; },

            // 0x8-
            /* 1 4      Z 0 H C ADD    A, B       */ () => { this.add(this.reg.BC, 1, 0); },
            /* 1 4      Z 0 H C ADD    A, C       */ () => { this.add(this.reg.BC, 0, 0); },
            /* 1 4      Z 0 H C ADD    A, D       */ () => { this.add(this.reg.DE, 1, 0); },
            /* 1 4      Z 0 H C ADD    A, E       */ () => { this.add(this.reg.DE, 0, 0); },
            /* 1 4      Z 0 H C ADD    A, H       */ () => { this.add(this.reg.HL, 1, 0); },
            /* 1 4      Z 0 H C ADD    A, L       */ () => { this.add(this.reg.HL, 0, 0); },
            /* 1 8      Z 0 H C ADD    A, (HL)    */ () => { this.HLPointerGet();  this.add(this.reg.TA, 1, 0); },
            /* 1 4      Z 0 H C ADD    A, A       */ () => { this.add(this.reg.TA, 0, 0); },
            /* 1 4      Z 0 H C ADC    A, B       */ () => { this.add(this.reg.BC, 1, this.getC()); },
            /* 1 4      Z 0 H C ADC    A, C       */ () => { this.add(this.reg.BC, 0, this.getC()); },
            /* 1 4      Z 0 H C ADC    A, D       */ () => { this.add(this.reg.DE, 1, this.getC()); },
            /* 1 4      Z 0 H C ADC    A, E       */ () => { this.add(this.reg.DE, 0, this.getC()); },
            /* 1 4      Z 0 H C ADC    A, H       */ () => { this.add(this.reg.HL, 1, this.getC()); },
            /* 1 4      Z 0 H C ADC    A, L       */ () => { this.add(this.reg.HL, 0, this.getC()); },
            /* 1 8      Z 0 H C ADC    A, (HL)    */ () => { this.HLPointerGet();  this.add(this.reg.TA, 1, this.getC()); },
            /* 1 4      Z 0 H C ADC    A, A       */ () => { this.add(this.reg.TA, 0, this.getC()); },

            // 0x9-
            /* 1 4      Z 1 H C SUB    B          */ () => { this.sub(this.reg.BC, 1, 0); },
            /* 1 4      Z 1 H C SUB    C          */ () => { this.sub(this.reg.BC, 0, 0); },
            /* 1 4      Z 1 H C SUB    D          */ () => { this.sub(this.reg.DE, 1, 0); },
            /* 1 4      Z 1 H C SUB    E          */ () => { this.sub(this.reg.DE, 0, 0); },
            /* 1 4      Z 1 H C SUB    H          */ () => { this.sub(this.reg.HL, 1, 0); },
            /* 1 4      Z 1 H C SUB    L          */ () => { this.sub(this.reg.HL, 0, 0); },
            /* 1 8      Z 1 H C SUB    (HL)       */ () => { this.HLPointerGet();  this.sub(this.reg.TA, 1, 0); },
            /* 1 4      1 1 0 0 SUB    A          */ () => { this.sub(this.reg.TA, 0, 0); },
            /* 1 4      Z 1 H C SBC    A, B       */ () => { this.sub(this.reg.BC, 1, this.getC()); },
            /* 1 4      Z 1 H C SBC    A, C       */ () => { this.sub(this.reg.BC, 0, this.getC()); },
            /* 1 4      Z 1 H C SBC    A, D       */ () => { this.sub(this.reg.DE, 1, this.getC()); },
            /* 1 4      Z 1 H C SBC    A, E       */ () => { this.sub(this.reg.DE, 0, this.getC()); },
            /* 1 4      Z 1 H C SBC    A, H       */ () => { this.sub(this.reg.HL, 1, this.getC()); },
            /* 1 4      Z 1 H C SBC    A, L       */ () => { this.sub(this.reg.HL, 0, this.getC()); },
            /* 1 8      Z 1 H C SBC    A, (HL)    */ () => { this.HLPointerGet();  this.sub(this.reg.TA, 1, this.getC()); },
            /* 1 4      Z 1 H - SBC    A, A       */ () => { this.sub(this.reg.TA, 0, this.getC()); },

            // 0xA-
            /* 1 4      Z 0 1 0 AND    B          */ () => { this.and(this.reg.BC, 1); },
            /* 1 4      Z 0 1 0 AND    C          */ () => { this.and(this.reg.BC, 0); },
            /* 1 4      Z 0 1 0 AND    D          */ () => { this.and(this.reg.DE, 1); },
            /* 1 4      Z 0 1 0 AND    E          */ () => { this.and(this.reg.DE, 0); },
            /* 1 4      Z 0 1 0 AND    H          */ () => { this.and(this.reg.HL, 1); },
            /* 1 4      Z 0 1 0 AND    L          */ () => { this.and(this.reg.HL, 0); },
            /* 1 8      Z 0 1 0 AND    (HL)       */ () => { this.HLPointerGet();  this.and(this.reg.TA, 1, 0); },
            /* 1 4      Z 0 1 0 AND    A          */ () => { this.and(this.reg.TA, 0); },
            /* 1 4      Z 0 0 0 XOR    B          */ () => { this.xor(this.reg.BC, 1); },
            /* 1 4      Z 0 0 0 XOR    C          */ () => { this.xor(this.reg.BC, 0); },
            /* 1 4      Z 0 0 0 XOR    D          */ () => { this.xor(this.reg.DE, 1); },
            /* 1 4      Z 0 0 0 XOR    E          */ () => { this.xor(this.reg.DE, 0); },
            /* 1 4      Z 0 0 0 XOR    H          */ () => { this.xor(this.reg.HL, 1); },
            /* 1 4      Z 0 0 0 XOR    L          */ () => { this.xor(this.reg.HL, 0); },
            /* 1 8      Z 0 0 0 XOR    (HL)       */ () => { this.HLPointerGet();  this.xor(this.reg.TA, 1, 0); },
            /* 1 4      1 0 0 0 XOR    A          */ () => { this.xor(this.reg.TA, 0); },

            // 0xB-
            /* 1 4      Z 0 0 0 OR     B          */ () => { this.or(this.reg.BC, 1); },
            /* 1 4      Z 0 0 0 OR     C          */ () => { this.or(this.reg.BC, 0); },
            /* 1 4      Z 0 0 0 OR     D          */ () => { this.or(this.reg.DE, 1); },
            /* 1 4      Z 0 0 0 OR     E          */ () => { this.or(this.reg.DE, 0); },
            /* 1 4      Z 0 0 0 OR     H          */ () => { this.or(this.reg.HL, 1); },
            /* 1 4      Z 0 0 0 OR     L          */ () => { this.or(this.reg.HL, 0); },
            /* 1 8      Z 0 0 0 OR     (HL)       */ () => { this.HLPointerGet();  this.or(this.reg.TA, 1, 0); },
            /* 1 4      Z 0 0 0 OR     A          */ () => { this.or(this.reg.TA, 0); },
            /* 1 4      Z 1 H C CP     B          */ () => { this.cp(this.reg.BC, 1); },
            /* 1 4      Z 1 H C CP     C          */ () => { this.cp(this.reg.BC, 0); },
            /* 1 4      Z 1 H C CP     D          */ () => { this.cp(this.reg.DE, 1); },
            /* 1 4      Z 1 H C CP     E          */ () => { this.cp(this.reg.DE, 0); },
            /* 1 4      Z 1 H C CP     H          */ () => { this.cp(this.reg.HL, 1); },
            /* 1 4      Z 1 H C CP     L          */ () => { this.cp(this.reg.HL, 0); },
            /* 1 8      Z 1 H C CP     (HL)       */ () => { this.HLPointerGet();  this.cp(this.reg.TA, 1, 0); },
            /* 1 4      1 1 0 0 CP     A          */ () => { this.cp(this.reg.TA, 0); },

            // 0xC-
            /* 1 20,8   - - - - RET    NZ         */ () => { if(!this.getZ()) this.ret(); else {this.condition_was_false = 1;} },
            /* 1 12     - - - - POP    BC         */ () => { this.pop(this.reg.BC); },
            /* 3 16,12  - - - - JP     NZ, a16    */ () => { if(!this.getZ()) this.jump(); else {this.reg.PC += 2; this.condition_was_false = 1;} },
            /* 3 16     - - - - JP     a16        */ () => { this.jump(); },
            /* 3 24,12  - - - - CALL   NZ, a16    */ () => { if(!this.getZ()) this.call(); else {this.reg.PC += 2; this.condition_was_false = 1;}},
            /* 1 16     - - - - PUSH   BC         */ () => { this.push(this.reg.BC); },
            /* 2 8      Z 0 H C ADD    A, d8      */ () => { this.reg.TT[0] = this.read(this.reg.PC++); this.add(this.reg.TT, 0, 0); },
            /* 1 16     - - - - RST    00H        */ () => { this.rst(0x00); },
            /* 1 20,8   - - - - RET    Z          */ () => { if(this.getZ()) this.ret(); else {this.condition_was_false = 1;}},
            /* 1 16     - - - - RET               */ () => { this.ret(); },
            /* 3 16,12  - - - - JP     Z, a16     */ () => { if(this.getZ()) this.jump(); else {this.reg.PC += 2; this.condition_was_false = 1;} },
            /* 1 4      - - - - PREFIX            */ () => { this.fetch_cbcode(); },
            /* 3 24,12  - - - - CALL   Z, a16     */ () => { if(this.getZ()) this.call(); else {this.reg.PC += 2; this.condition_was_false = 1;}},
            /* 3 24     - - - - CALL   a16        */ () => { this.call(); },
            /* 2 8      Z 0 H C ADC    A, d8      */ () => { this.reg.TT[0] = this.read(this.reg.PC++); this.add(this.reg.TT, 0, this.getC()); },
            /* 1 16     - - - - RST    08H        */ () => { this.rst(0x08); },

           // 0xD- 
            /* 1 20,8   - - - - RET    NC         */ () => { if(!this.getC()) this.ret(); else {this.condition_was_false = 1;}},
            /* 1 12     - - - - POP    DE         */ () => { this.pop(this.reg.DE); },
            /* 3 16,12  - - - - JP     NC, a16    */ () => { if(!this.getC()) this.jump(); else {this.reg.PC += 2; this.condition_was_false = 1;} },
            /* 1 4      - - - -  --               */ () => { this.kill(); },
            /* 3 24,12  - - - - CALL   NC, a16    */ () => { if(!this.getC()) this.call(); else {this.reg.PC += 2; this.condition_was_false = 1;}},
            /* 1 16     - - - - PUSH   DE         */ () => { this.push(this.reg.DE); },
            /* 2 8      Z 1 H C SUB    d8         */ () => { this.reg.TT[0] = this.read(this.reg.PC++); this.sub(this.reg.TT, 0, 0); },
            /* 1 16     - - - - RST    10H        */ () => { this.rst(0x10); },
            /* 1 20,8   - - - - RET    C          */ () => { if(this.getC()) this.ret(); else {this.condition_was_false = 1;}},
            /* 1 16     - - - - RETI              */ () => { this.reg.IME = 1; this.ret(); },
            /* 3 16,12  - - - - JP     C, a16     */ () => { if(this.getC()) this.jump(); else {this.reg.PC += 2; this.condition_was_false = 1;} },
            /* 1 4      - - - -  --               */ () => { this.kill(); },
            /* 3 24,12  - - - - CALL   C, a16     */ () => { if(this.getC()) this.call(); else {this.reg.PC += 2; this.condition_was_false = 1;}},
            /* 1 4      - - - -  --               */ () => { this.kill(); },
            /* 2 8      Z 1 H C SBC    A, d8      */ () => { this.reg.TT[0] = this.read(this.reg.PC++); this.sub(this.reg.TT, 0, this.getC()); },
            /* 1 16     - - - - RST    18H        */ () => { this.rst(0x18); },

            // 0xE-
            /* 2 12     - - - - LDH    (a8), A    */ () => { this.write(this.read(this.reg.PC++) + 0xFF00, this.reg.TA[0]); },
            /* 1 12     - - - - POP    HL         */ () => { this.pop(this.reg.HL); },
            /* 1 8      - - - - LD     (C), A     */ () => { this.write(this.reg.BC[0] + 0xFF00, this.reg.TA[0]); },
            /* 1 4      - - - -  --               */ () => { this.kill(); },
            /* 1 4      - - - -  --               */ () => { this.kill(); },
            /* 1 16     - - - - PUSH   HL         */ () => { this.push(this.reg.HL); },
            /* 2 8      Z 0 1 0 AND    d8         */ () => { this.reg.TT[0] = this.read(this.reg.PC++); this.and(this.reg.TT, 0); },
            /* 1 16     - - - - RST    20H        */ () => { this.rst(0x20); },
            /* 2 16     0 0 H C ADD    SP, r8     */ () => { this.addsp(this.read(this.reg.PC++)); },
            /* 1 4      - - - - JP     HL         */ () => { this.reg.PC = this.make16(this.reg.HL); },
            /* 3 16     - - - - LD     (a16), A   */ () => { this.write(this.get16(), this.reg.TA[0]); },
            /* 1 4      - - - -  --               */ () => { this.kill(); },
            /* 1 4      - - - -  --               */ () => { this.kill(); },
            /* 1 4      - - - -  --               */ () => { this.kill(); },
            /* 2 8      Z 0 0 0 XOR    d8         */ () => { this.reg.TT[0] = this.read(this.reg.PC++); this.xor(this.reg.TT, 0); },
            /* 1 16     - - - - RST    28H        */ () => { this.rst(0x28); },

            // 0xF-
            /* 2 12     - - - - LDH    A, (a8)    */ () => { this.reg.TA[0] = this.read(this.read(this.reg.PC++) + 0xFF00); },
            /* 1 12     Z N H C POP    AF         */ () => { this.reg.F = this.read(this.reg.SP++) & 0xF0; this.reg.TA[0] = this.read(this.reg.SP++); },
            /* 1 8      - - - - LD     A, (C)     */ () => { this.reg.TA[0] = this.read(this.reg.BC[0] + 0xFF00); },
            /* 1 4      - - - - DI                */ () => { this.reg.IME = 0; },
            /* 1 4      - - - -  --               */ () => { this.kill(); },
            /* 1 16     - - - - PUSH   AF         */ () => { this.write(--this.reg.SP, this.reg.TA[0]); this.write(--this.reg.SP, this.reg.F); },
            /* 2 8      Z 0 0 0 OR     d8         */ () => { this.reg.TT[0] = this.read(this.reg.PC++); this.or(this.reg.TT, 0); },
            /* 1 16     - - - - RST    30H        */ () => { this.rst(0x30); },
            /* 2 12     0 0 H C LD     HL, SP +r8 */ () => { this.addwsp(this.read(this.reg.PC++));},
            /* 1 8      - - - - LD     SP, HL     */ () => { this.reg.SP = this.make16(this.reg.HL); },
            /* 3 16     - - - - LD     A, (a16)   */ () => { this.reg.TA[0] = this.read(this.get16()); },
            /* 1 4      - - - - EI                */ () => { this.reg.IME = 1; },
            /* 1 4      - - - -  --               */ () => { this.kill(); },
            /* 1 4      - - - -  --               */ () => { this.kill(); },
            /* 2 8      Z 1 H C CP     d8         */ () => { this.reg.TT[0] = this.read(this.reg.PC++); this.cp(this.reg.TT, 0); },
            /* 1 16     - - - - RST    38H        */ () => { this.rst(0x38); }
        ];
        this.cbcodeTable = [
            /* 2 8      Z 0 0 C RLC    B          */ () => { this.rlc(this.reg.BC, 1); },
            /* 2 8      Z 0 0 C RLC    C          */ () => { this.rlc(this.reg.BC, 0); },
            /* 2 8      Z 0 0 C RLC    D          */ () => { this.rlc(this.reg.DE, 1); },
            /* 2 8      Z 0 0 C RLC    E          */ () => { this.rlc(this.reg.DE, 0); },
            /* 2 8      Z 0 0 C RLC    H          */ () => { this.rlc(this.reg.HL, 1); },
            /* 2 8      Z 0 0 C RLC    L          */ () => { this.rlc(this.reg.HL, 0); },
            /* 2 16     Z 0 0 C RLC    (HL)       */ () => { this.HLPointerGet();  this.rlc(this.reg.TA, 1); this.HLPointerSet();  },
            /* 2 8      Z 0 0 C RLC    A          */ () => { this.rlc(this.reg.TA, 0); },
            /* 2 8      Z 0 0 C RRC    B          */ () => { this.rrc(this.reg.BC, 1); },
            /* 2 8      Z 0 0 C RRC    C          */ () => { this.rrc(this.reg.BC, 0); },
            /* 2 8      Z 0 0 C RRC    D          */ () => { this.rrc(this.reg.DE, 1); },
            /* 2 8      Z 0 0 C RRC    E          */ () => { this.rrc(this.reg.DE, 0); },
            /* 2 8      Z 0 0 C RRC    H          */ () => { this.rrc(this.reg.HL, 1); },
            /* 2 8      Z 0 0 C RRC    L          */ () => { this.rrc(this.reg.HL, 0); },
            /* 2 16     Z 0 0 C RRC    (HL)       */ () => { this.HLPointerGet();  this.rrc(this.reg.TA, 1); this.HLPointerSet();  },
            /* 2 8      Z 0 0 C RRC    A          */ () => { this.rrc(this.reg.TA, 0); },

            /* 2 8      Z 0 0 C RL     B          */ () => { this.rltc(this.reg.BC, 1); },
            /* 2 8      Z 0 0 C RL     C          */ () => { this.rltc(this.reg.BC, 0); },
            /* 2 8      Z 0 0 C RL     D          */ () => { this.rltc(this.reg.DE, 1); },
            /* 2 8      Z 0 0 C RL     E          */ () => { this.rltc(this.reg.DE, 0); },
            /* 2 8      Z 0 0 C RL     H          */ () => { this.rltc(this.reg.HL, 1); },
            /* 2 8      Z 0 0 C RL     L          */ () => { this.rltc(this.reg.HL, 0); },
            /* 2 16     Z 0 0 C RL     (HL)       */ () => { this.HLPointerGet();  this.rltc(this.reg.TA, 1); this.HLPointerSet();  },
            /* 2 8      Z 0 0 C RL     A          */ () => { this.rltc(this.reg.TA, 0); },
            /* 2 8      Z 0 0 C RR     B          */ () => { this.rrtc(this.reg.BC, 1); },
            /* 2 8      Z 0 0 C RR     C          */ () => { this.rrtc(this.reg.BC, 0); },
            /* 2 8      Z 0 0 C RR     D          */ () => { this.rrtc(this.reg.DE, 1); },
            /* 2 8      Z 0 0 C RR     E          */ () => { this.rrtc(this.reg.DE, 0); },
            /* 2 8      Z 0 0 C RR     H          */ () => { this.rrtc(this.reg.HL, 1); },
            /* 2 8      Z 0 0 C RR     L          */ () => { this.rrtc(this.reg.HL, 0); },
            /* 2 16     Z 0 0 C RR     (HL)       */ () => { this.HLPointerGet();  this.rrtc(this.reg.TA, 1); this.HLPointerSet();  },
            /* 2 8      Z 0 0 C RR     A          */ () => { this.rrtc(this.reg.TA, 0); },

            /* 2 8      Z 0 0 C SLA    B          */ () => { this.sla(this.reg.BC, 1); },
            /* 2 8      Z 0 0 C SLA    C          */ () => { this.sla(this.reg.BC, 0); },
            /* 2 8      Z 0 0 C SLA    D          */ () => { this.sla(this.reg.DE, 1); },
            /* 2 8      Z 0 0 C SLA    E          */ () => { this.sla(this.reg.DE, 0); },
            /* 2 8      Z 0 0 C SLA    H          */ () => { this.sla(this.reg.HL, 1); },
            /* 2 8      Z 0 0 C SLA    L          */ () => { this.sla(this.reg.HL, 0); },
            /* 2 16     Z 0 0 C SLA    (HL)       */ () => { this.HLPointerGet();  this.sla(this.reg.TA, 1); this.HLPointerSet();  },
            /* 2 8      Z 0 0 C SLA    A          */ () => { this.sla(this.reg.TA, 0); },
            /* 2 8      Z 0 0 C SRA    B          */ () => { this.sra(this.reg.BC, 1); },
            /* 2 8      Z 0 0 C SRA    C          */ () => { this.sra(this.reg.BC, 0); },
            /* 2 8      Z 0 0 C SRA    D          */ () => { this.sra(this.reg.DE, 1); },
            /* 2 8      Z 0 0 C SRA    E          */ () => { this.sra(this.reg.DE, 0); },
            /* 2 8      Z 0 0 C SRA    H          */ () => { this.sra(this.reg.HL, 1); },
            /* 2 8      Z 0 0 C SRA    L          */ () => { this.sra(this.reg.HL, 0); },
            /* 2 16     Z 0 0 C SRA    (HL)       */ () => { this.HLPointerGet();  this.sra(this.reg.TA, 1); this.HLPointerSet();  },
            /* 2 8      Z 0 0 C SRA    A          */ () => { this.sra(this.reg.TA, 0); },

            /* 2 8      Z 0 0 0 SWAP   B          */ () => { this.swap(this.reg.BC, 1); },
            /* 2 8      Z 0 0 0 SWAP   C          */ () => { this.swap(this.reg.BC, 0); },
            /* 2 8      Z 0 0 0 SWAP   D          */ () => { this.swap(this.reg.DE, 1); },
            /* 2 8      Z 0 0 0 SWAP   E          */ () => { this.swap(this.reg.DE, 0); },
            /* 2 8      Z 0 0 0 SWAP   H          */ () => { this.swap(this.reg.HL, 1); },
            /* 2 8      Z 0 0 0 SWAP   L          */ () => { this.swap(this.reg.HL, 0); },
            /* 2 16     Z 0 0 0 SWAP   (HL)       */ () => { this.HLPointerGet();  this.swap(this.reg.TA, 1); this.HLPointerSet();  },
            /* 2 8      Z 0 0 0 SWAP   A          */ () => { this.swap(this.reg.TA, 0); },
            /* 2 8      Z 0 0 C SRL    B          */ () => { this.srl(this.reg.BC, 1); },
            /* 2 8      Z 0 0 C SRL    C          */ () => { this.srl(this.reg.BC, 0); },
            /* 2 8      Z 0 0 C SRL    D          */ () => { this.srl(this.reg.DE, 1); },
            /* 2 8      Z 0 0 C SRL    E          */ () => { this.srl(this.reg.DE, 0); },
            /* 2 8      Z 0 0 C SRL    H          */ () => { this.srl(this.reg.HL, 1); },
            /* 2 8      Z 0 0 C SRL    L          */ () => { this.srl(this.reg.HL, 0); },
            /* 2 16     Z 0 0 C SRL    (HL)       */ () => { this.HLPointerGet();  this.srl(this.reg.TA, 1); this.HLPointerSet();  },
            /* 2 8      Z 0 0 C SRL    A          */ () => { this.srl(this.reg.TA, 0); },

            /* 2 8      Z 0 1 - BIT    0, B       */ () => { this.getBit(this.reg.BC[1], 0); },
            /* 2 8      Z 0 1 - BIT    0, C       */ () => { this.getBit(this.reg.BC[0], 0); },
            /* 2 8      Z 0 1 - BIT    0, D       */ () => { this.getBit(this.reg.DE[1], 0); },
            /* 2 8      Z 0 1 - BIT    0, E       */ () => { this.getBit(this.reg.DE[0], 0); },
            /* 2 8      Z 0 1 - BIT    0, H       */ () => { this.getBit(this.reg.HL[1], 0); },
            /* 2 8      Z 0 1 - BIT    0, L       */ () => { this.getBit(this.reg.HL[0], 0); },
            /* 2 12     Z 0 1 - BIT    0, (HL)    */ () => { this.HLPointerGet();  this.getBit(this.reg.TA[1], 0); },
            /* 2 8      Z 0 1 - BIT    0, A       */ () => { this.getBit(this.reg.TA[0], 0); },
            /* 2 8      Z 0 1 - BIT    1, B       */ () => { this.getBit(this.reg.BC[1], 1); },
            /* 2 8      Z 0 1 - BIT    1, C       */ () => { this.getBit(this.reg.BC[0], 1); },
            /* 2 8      Z 0 1 - BIT    1, D       */ () => { this.getBit(this.reg.DE[1], 1); },
            /* 2 8      Z 0 1 - BIT    1, E       */ () => { this.getBit(this.reg.DE[0], 1); },
            /* 2 8      Z 0 1 - BIT    1, H       */ () => { this.getBit(this.reg.HL[1], 1); },
            /* 2 8      Z 0 1 - BIT    1, L       */ () => { this.getBit(this.reg.HL[0], 1); },
            /* 2 12     Z 0 1 - BIT    1, (HL)    */ () => { this.HLPointerGet();  this.getBit(this.reg.TA[1], 1); },
            /* 2 8      Z 0 1 - BIT    1, A       */ () => { this.getBit(this.reg.TA[0], 1); },

            /* 2 8      Z 0 1 - BIT    2, B       */ () => { this.getBit(this.reg.BC[1], 2); },
            /* 2 8      Z 0 1 - BIT    2, C       */ () => { this.getBit(this.reg.BC[0], 2); },
            /* 2 8      Z 0 1 - BIT    2, D       */ () => { this.getBit(this.reg.DE[1], 2); },
            /* 2 8      Z 0 1 - BIT    2, E       */ () => { this.getBit(this.reg.DE[0], 2); },
            /* 2 8      Z 0 1 - BIT    2, H       */ () => { this.getBit(this.reg.HL[1], 2); },
            /* 2 8      Z 0 1 - BIT    2, L       */ () => { this.getBit(this.reg.HL[0], 2); },
            /* 2 12     Z 0 1 - BIT    2, (HL)    */ () => { this.HLPointerGet();  this.getBit(this.reg.TA[1], 2); },
            /* 2 8      Z 0 1 - BIT    2, A       */ () => { this.getBit(this.reg.TA[0], 2); },
            /* 2 8      Z 0 1 - BIT    3, B       */ () => { this.getBit(this.reg.BC[1], 3); },
            /* 2 8      Z 0 1 - BIT    3, C       */ () => { this.getBit(this.reg.BC[0], 3); },
            /* 2 8      Z 0 1 - BIT    3, D       */ () => { this.getBit(this.reg.DE[1], 3); },
            /* 2 8      Z 0 1 - BIT    3, E       */ () => { this.getBit(this.reg.DE[0], 3); },
            /* 2 8      Z 0 1 - BIT    3, H       */ () => { this.getBit(this.reg.HL[1], 3); },
            /* 2 8      Z 0 1 - BIT    3, L       */ () => { this.getBit(this.reg.HL[0], 3); },
            /* 2 12     Z 0 1 - BIT    3, (HL)    */ () => { this.HLPointerGet();  this.getBit(this.reg.TA[1], 3); },
            /* 2 8      Z 0 1 - BIT    3, A       */ () => { this.getBit(this.reg.TA[0], 3); },

            /* 2 8      Z 0 1 - BIT    4, B       */ () => { this.getBit(this.reg.BC[1], 4); },
            /* 2 8      Z 0 1 - BIT    4, C       */ () => { this.getBit(this.reg.BC[0], 4); },
            /* 2 8      Z 0 1 - BIT    4, D       */ () => { this.getBit(this.reg.DE[1], 4); },
            /* 2 8      Z 0 1 - BIT    4, E       */ () => { this.getBit(this.reg.DE[0], 4); },
            /* 2 8      Z 0 1 - BIT    4, H       */ () => { this.getBit(this.reg.HL[1], 4); },
            /* 2 8      Z 0 1 - BIT    4, L       */ () => { this.getBit(this.reg.HL[0], 4); },
            /* 2 12     Z 0 1 - BIT    4, (HL)    */ () => { this.HLPointerGet();  this.getBit(this.reg.TA[1], 4); },
            /* 2 8      Z 0 1 - BIT    4, A       */ () => { this.getBit(this.reg.TA[0], 4); },
            /* 2 8      Z 0 1 - BIT    5, B       */ () => { this.getBit(this.reg.BC[1], 5); },
            /* 2 8      Z 0 1 - BIT    5, C       */ () => { this.getBit(this.reg.BC[0], 5); },
            /* 2 8      Z 0 1 - BIT    5, D       */ () => { this.getBit(this.reg.DE[1], 5); },
            /* 2 8      Z 0 1 - BIT    5, E       */ () => { this.getBit(this.reg.DE[0], 5); },
            /* 2 8      Z 0 1 - BIT    5, H       */ () => { this.getBit(this.reg.HL[1], 5); },
            /* 2 8      Z 0 1 - BIT    5, L       */ () => { this.getBit(this.reg.HL[0], 5); },
            /* 2 12     Z 0 1 - BIT    5, (HL)    */ () => { this.HLPointerGet();  this.getBit(this.reg.TA[1], 5); },
            /* 2 8      Z 0 1 - BIT    5, A       */ () => { this.getBit(this.reg.TA[0], 5); },

            /* 2 8      Z 0 1 - BIT    6, B       */ () => { this.getBit(this.reg.BC[1], 6); },
            /* 2 8      Z 0 1 - BIT    6, C       */ () => { this.getBit(this.reg.BC[0], 6); },
            /* 2 8      Z 0 1 - BIT    6, D       */ () => { this.getBit(this.reg.DE[1], 6); },
            /* 2 8      Z 0 1 - BIT    6, E       */ () => { this.getBit(this.reg.DE[0], 6); },
            /* 2 8      Z 0 1 - BIT    6, H       */ () => { this.getBit(this.reg.HL[1], 6); },
            /* 2 8      Z 0 1 - BIT    6, L       */ () => { this.getBit(this.reg.HL[0], 6); },
            /* 2 12     Z 0 1 - BIT    6, (HL)    */ () => { this.HLPointerGet();  this.getBit(this.reg.TA[1], 6); },
            /* 2 8      Z 0 1 - BIT    6, A       */ () => { this.getBit(this.reg.TA[0], 6); },
            /* 2 8      Z 0 1 - BIT    7, B       */ () => { this.getBit(this.reg.BC[1], 7); },
            /* 2 8      Z 0 1 - BIT    7, C       */ () => { this.getBit(this.reg.BC[0], 7); },
            /* 2 8      Z 0 1 - BIT    7, D       */ () => { this.getBit(this.reg.DE[1], 7); },
            /* 2 8      Z 0 1 - BIT    7, E       */ () => { this.getBit(this.reg.DE[0], 7); },
            /* 2 8      Z 0 1 - BIT    7, H       */ () => { this.getBit(this.reg.HL[1], 7); },
            /* 2 8      Z 0 1 - BIT    7, L       */ () => { this.getBit(this.reg.HL[0], 7); },
            /* 2 12     Z 0 1 - BIT    7, (HL)    */ () => { this.HLPointerGet();  this.getBit(this.reg.TA[1], 7); },
            /* 2 8      Z 0 1 - BIT    7, A       */ () => { this.getBit(this.reg.TA[0], 7); },

            /* 2 8      - - - - RES    0, B       */ () => { this.setBit(this.reg.BC, 1, 0, 0); },
            /* 2 8      - - - - RES    0, C       */ () => { this.setBit(this.reg.BC, 0, 0, 0); },
            /* 2 8      - - - - RES    0, D       */ () => { this.setBit(this.reg.DE, 1, 0, 0); },
            /* 2 8      - - - - RES    0, E       */ () => { this.setBit(this.reg.DE, 0, 0, 0); },
            /* 2 8      - - - - RES    0, H       */ () => { this.setBit(this.reg.HL, 1, 0, 0); },
            /* 2 8      - - - - RES    0, L       */ () => { this.setBit(this.reg.HL, 0, 0, 0); },
            /* 2 16     - - - - RES    0, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 0, 0); this.HLPointerSet();  },
            /* 2 8      - - - - RES    0, A       */ () => { this.setBit(this.reg.TA, 0, 0, 0); },
            /* 2 8      - - - - RES    1, B       */ () => { this.setBit(this.reg.BC, 1, 1, 0); },
            /* 2 8      - - - - RES    1, C       */ () => { this.setBit(this.reg.BC, 0, 1, 0); },
            /* 2 8      - - - - RES    1, D       */ () => { this.setBit(this.reg.DE, 1, 1, 0); },
            /* 2 8      - - - - RES    1, E       */ () => { this.setBit(this.reg.DE, 0, 1, 0); },
            /* 2 8      - - - - RES    1, H       */ () => { this.setBit(this.reg.HL, 1, 1, 0); },
            /* 2 8      - - - - RES    1, L       */ () => { this.setBit(this.reg.HL, 0, 1, 0); },
            /* 2 16     - - - - RES    1, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 1, 0); this.HLPointerSet();  },
            /* 2 8      - - - - RES    1, A       */ () => { this.setBit(this.reg.TA, 0, 1, 0); },

            /* 2 8      - - - - RES    2, B       */ () => { this.setBit(this.reg.BC, 1, 2, 0); },
            /* 2 8      - - - - RES    2, C       */ () => { this.setBit(this.reg.BC, 0, 2, 0); },
            /* 2 8      - - - - RES    2, D       */ () => { this.setBit(this.reg.DE, 1, 2, 0); },
            /* 2 8      - - - - RES    2, E       */ () => { this.setBit(this.reg.DE, 0, 2, 0); },
            /* 2 8      - - - - RES    2, H       */ () => { this.setBit(this.reg.HL, 1, 2, 0); },
            /* 2 8      - - - - RES    2, L       */ () => { this.setBit(this.reg.HL, 0, 2, 0); },
            /* 2 16     - - - - RES    2, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 2, 0); this.HLPointerSet();  },
            /* 2 8      - - - - RES    2, A       */ () => { this.setBit(this.reg.TA, 0, 2, 0); },
            /* 2 8      - - - - RES    3, B       */ () => { this.setBit(this.reg.BC, 1, 3, 0); },
            /* 2 8      - - - - RES    3, C       */ () => { this.setBit(this.reg.BC, 0, 3, 0); },
            /* 2 8      - - - - RES    3, D       */ () => { this.setBit(this.reg.DE, 1, 3, 0); },
            /* 2 8      - - - - RES    3, E       */ () => { this.setBit(this.reg.DE, 0, 3, 0); },
            /* 2 8      - - - - RES    3, H       */ () => { this.setBit(this.reg.HL, 1, 3, 0); },
            /* 2 8      - - - - RES    3, L       */ () => { this.setBit(this.reg.HL, 0, 3, 0); },
            /* 2 16     - - - - RES    3, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 3, 0); this.HLPointerSet();  },
            /* 2 8      - - - - RES    3, A       */ () => { this.setBit(this.reg.TA, 0, 3, 0); },

            /* 2 8      - - - - RES    4, B       */ () => { this.setBit(this.reg.BC, 1, 4, 0); },
            /* 2 8      - - - - RES    4, C       */ () => { this.setBit(this.reg.BC, 0, 4, 0); },
            /* 2 8      - - - - RES    4, D       */ () => { this.setBit(this.reg.DE, 1, 4, 0); },
            /* 2 8      - - - - RES    4, E       */ () => { this.setBit(this.reg.DE, 0, 4, 0); },
            /* 2 8      - - - - RES    4, H       */ () => { this.setBit(this.reg.HL, 1, 4, 0); },
            /* 2 8      - - - - RES    4, L       */ () => { this.setBit(this.reg.HL, 0, 4, 0); },
            /* 2 16     - - - - RES    4, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 4, 0); this.HLPointerSet();  },
            /* 2 8      - - - - RES    4, A       */ () => { this.setBit(this.reg.TA, 0, 4, 0); },
            /* 2 8      - - - - RES    5, B       */ () => { this.setBit(this.reg.BC, 1, 5, 0); },
            /* 2 8      - - - - RES    5, C       */ () => { this.setBit(this.reg.BC, 0, 5, 0); },
            /* 2 8      - - - - RES    5, D       */ () => { this.setBit(this.reg.DE, 1, 5, 0); },
            /* 2 8      - - - - RES    5, E       */ () => { this.setBit(this.reg.DE, 0, 5, 0); },
            /* 2 8      - - - - RES    5, H       */ () => { this.setBit(this.reg.HL, 1, 5, 0); },
            /* 2 8      - - - - RES    5, L       */ () => { this.setBit(this.reg.HL, 0, 5, 0); },
            /* 2 16     - - - - RES    5, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 5, 0); this.HLPointerSet();  },
            /* 2 8      - - - - RES    5, A       */ () => { this.setBit(this.reg.TA, 0, 5, 0); },

            /* 2 8      - - - - RES    6, B       */ () => { this.setBit(this.reg.BC, 1, 6, 0); },
            /* 2 8      - - - - RES    6, C       */ () => { this.setBit(this.reg.BC, 0, 6, 0); },
            /* 2 8      - - - - RES    6, D       */ () => { this.setBit(this.reg.DE, 1, 6, 0); },
            /* 2 8      - - - - RES    6, E       */ () => { this.setBit(this.reg.DE, 0, 6, 0); },
            /* 2 8      - - - - RES    6, H       */ () => { this.setBit(this.reg.HL, 1, 6, 0); },
            /* 2 8      - - - - RES    6, L       */ () => { this.setBit(this.reg.HL, 0, 6, 0); },
            /* 2 16     - - - - RES    6, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 6, 0); this.HLPointerSet();  },
            /* 2 8      - - - - RES    6, A       */ () => { this.setBit(this.reg.TA, 0, 6, 0); },
            /* 2 8      - - - - RES    7, B       */ () => { this.setBit(this.reg.BC, 1, 7, 0); },
            /* 2 8      - - - - RES    7, C       */ () => { this.setBit(this.reg.BC, 0, 7, 0); },
            /* 2 8      - - - - RES    7, D       */ () => { this.setBit(this.reg.DE, 1, 7, 0); },
            /* 2 8      - - - - RES    7, E       */ () => { this.setBit(this.reg.DE, 0, 7, 0); },
            /* 2 8      - - - - RES    7, H       */ () => { this.setBit(this.reg.HL, 1, 7, 0); },
            /* 2 8      - - - - RES    7, L       */ () => { this.setBit(this.reg.HL, 0, 7, 0); },
            /* 2 16     - - - - RES    7, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 7, 0); this.HLPointerSet();  },
            /* 2 8      - - - - RES    7, A       */ () => { this.setBit(this.reg.TA, 0, 7, 0); },

            /* 2 8      - - - - SET    0, B       */ () => { this.setBit(this.reg.BC, 1, 0, 1); },
            /* 2 8      - - - - SET    0, C       */ () => { this.setBit(this.reg.BC, 0, 0, 1); },
            /* 2 8      - - - - SET    0, D       */ () => { this.setBit(this.reg.DE, 1, 0, 1); },
            /* 2 8      - - - - SET    0, E       */ () => { this.setBit(this.reg.DE, 0, 0, 1); },
            /* 2 8      - - - - SET    0, H       */ () => { this.setBit(this.reg.HL, 1, 0, 1); },
            /* 2 8      - - - - SET    0, L       */ () => { this.setBit(this.reg.HL, 0, 0, 1); },
            /* 2 16     - - - - SET    0, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 0, 1); this.HLPointerSet();  },
            /* 2 8      - - - - SET    0, A       */ () => { this.setBit(this.reg.TA, 0, 0, 1); },
            /* 2 8      - - - - SET    1, B       */ () => { this.setBit(this.reg.BC, 1, 1, 1); },
            /* 2 8      - - - - SET    1, C       */ () => { this.setBit(this.reg.BC, 0, 1, 1); },
            /* 2 8      - - - - SET    1, D       */ () => { this.setBit(this.reg.DE, 1, 1, 1); },
            /* 2 8      - - - - SET    1, E       */ () => { this.setBit(this.reg.DE, 0, 1, 1); },
            /* 2 8      - - - - SET    1, H       */ () => { this.setBit(this.reg.HL, 1, 1, 1); },
            /* 2 8      - - - - SET    1, L       */ () => { this.setBit(this.reg.HL, 0, 1, 1); },
            /* 2 16     - - - - SET    1, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 1, 1); this.HLPointerSet();  },
            /* 2 8      - - - - SET    1, A       */ () => { this.setBit(this.reg.TA, 0, 1, 1); },

            /* 2 8      - - - - SET    2, B       */ () => { this.setBit(this.reg.BC, 1, 2, 1); },
            /* 2 8      - - - - SET    2, C       */ () => { this.setBit(this.reg.BC, 0, 2, 1); },
            /* 2 8      - - - - SET    2, D       */ () => { this.setBit(this.reg.DE, 1, 2, 1); },
            /* 2 8      - - - - SET    2, E       */ () => { this.setBit(this.reg.DE, 0, 2, 1); },
            /* 2 8      - - - - SET    2, H       */ () => { this.setBit(this.reg.HL, 1, 2, 1); },
            /* 2 8      - - - - SET    2, L       */ () => { this.setBit(this.reg.HL, 0, 2, 1); },
            /* 2 16     - - - - SET    2, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 2, 1); this.HLPointerSet();  },
            /* 2 8      - - - - SET    2, A       */ () => { this.setBit(this.reg.TA, 0, 2, 1); },
            /* 2 8      - - - - SET    3, B       */ () => { this.setBit(this.reg.BC, 1, 3, 1); },
            /* 2 8      - - - - SET    3, C       */ () => { this.setBit(this.reg.BC, 0, 3, 1); },
            /* 2 8      - - - - SET    3, D       */ () => { this.setBit(this.reg.DE, 1, 3, 1); },
            /* 2 8      - - - - SET    3, E       */ () => { this.setBit(this.reg.DE, 0, 3, 1); },
            /* 2 8      - - - - SET    3, H       */ () => { this.setBit(this.reg.HL, 1, 3, 1); },
            /* 2 8      - - - - SET    3, L       */ () => { this.setBit(this.reg.HL, 0, 3, 1); },
            /* 2 16     - - - - SET    3, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 3, 1); this.HLPointerSet();  },
            /* 2 8      - - - - SET    3, A       */ () => { this.setBit(this.reg.TA, 0, 3, 1); },

            /* 2 8      - - - - SET    4, B       */ () => { this.setBit(this.reg.BC, 1, 4, 1); },
            /* 2 8      - - - - SET    4, C       */ () => { this.setBit(this.reg.BC, 0, 4, 1); },
            /* 2 8      - - - - SET    4, D       */ () => { this.setBit(this.reg.DE, 1, 4, 1); },
            /* 2 8      - - - - SET    4, E       */ () => { this.setBit(this.reg.DE, 0, 4, 1); },
            /* 2 8      - - - - SET    4, H       */ () => { this.setBit(this.reg.HL, 1, 4, 1); },
            /* 2 8      - - - - SET    4, L       */ () => { this.setBit(this.reg.HL, 0, 4, 1); },
            /* 2 16     - - - - SET    4, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 4, 1); this.HLPointerSet();  },
            /* 2 8      - - - - SET    4, A       */ () => { this.setBit(this.reg.TA, 0, 4, 1); },
            /* 2 8      - - - - SET    5, B       */ () => { this.setBit(this.reg.BC, 1, 5, 1); },
            /* 2 8      - - - - SET    5, C       */ () => { this.setBit(this.reg.BC, 0, 5, 1); },
            /* 2 8      - - - - SET    5, D       */ () => { this.setBit(this.reg.DE, 1, 5, 1); },
            /* 2 8      - - - - SET    5, E       */ () => { this.setBit(this.reg.DE, 0, 5, 1); },
            /* 2 8      - - - - SET    5, H       */ () => { this.setBit(this.reg.HL, 1, 5, 1); },
            /* 2 8      - - - - SET    5, L       */ () => { this.setBit(this.reg.HL, 0, 5, 1); },
            /* 2 16     - - - - SET    5, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 5, 1); this.HLPointerSet();  },
            /* 2 8      - - - - SET    5, A       */ () => { this.setBit(this.reg.TA, 0, 5, 1); },

            /* 2 8      - - - - SET    6, B       */ () => { this.setBit(this.reg.BC, 1, 6, 1); },
            /* 2 8      - - - - SET    6, C       */ () => { this.setBit(this.reg.BC, 0, 6, 1); },
            /* 2 8      - - - - SET    6, D       */ () => { this.setBit(this.reg.DE, 1, 6, 1); },
            /* 2 8      - - - - SET    6, E       */ () => { this.setBit(this.reg.DE, 0, 6, 1); },
            /* 2 8      - - - - SET    6, H       */ () => { this.setBit(this.reg.HL, 1, 6, 1); },
            /* 2 8      - - - - SET    6, L       */ () => { this.setBit(this.reg.HL, 0, 6, 1); },
            /* 2 16     - - - - SET    6, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 6, 1); this.HLPointerSet();  },
            /* 2 8      - - - - SET    6, A       */ () => { this.setBit(this.reg.TA, 0, 6, 1); },
            /* 2 8      - - - - SET    7, B       */ () => { this.setBit(this.reg.BC, 1, 7, 1); },
            /* 2 8      - - - - SET    7, C       */ () => { this.setBit(this.reg.BC, 0, 7, 1); },
            /* 2 8      - - - - SET    7, D       */ () => { this.setBit(this.reg.DE, 1, 7, 1); },
            /* 2 8      - - - - SET    7, E       */ () => { this.setBit(this.reg.DE, 0, 7, 1); },
            /* 2 8      - - - - SET    7, H       */ () => { this.setBit(this.reg.HL, 1, 7, 1); },
            /* 2 8      - - - - SET    7, L       */ () => { this.setBit(this.reg.HL, 0, 7, 1); },
            /* 2 16     - - - - SET    7, (HL)    */ () => { this.HLPointerGet();  this.setBit(this.reg.TA, 1, 7, 1); this.HLPointerSet();  },
            /* 2 8      - - - - SET    7, A       */ () => { this.setBit(this.reg.TA, 0, 7, 1); }
        ];
        
        // This is stupid, because very few of these actually need it.
        // But who wants if statements anyway? Lol
        this.optiming_read = [
        //      0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F
        /* 0 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 1 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 1 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 3 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 4 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 5 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 6 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 7 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 8 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 9 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* A */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* B */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* C */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* D */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* E */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* F */ 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 0, 0, 0,
        ];
        this.cbtiming_read = [
        //      0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F
        /* 0 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 1 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 1 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 3 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 4 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 5 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 6 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 7 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 8 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 9 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* A */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* B */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* C */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* D */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* E */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* F */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        ];
        this.optiming_write = [
        //      0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F
        /* 0 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 1 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 1 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 3 */ 0, 0, 0, 0, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 4 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 5 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 6 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 7 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 8 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* 9 */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* A */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* B */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* C */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* D */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        /* E */ 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 0, 0, 4, 0, 0,
        /* F */ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ];
        this.cbtiming_write = [
        //      0  1  2  3  4  5  6  7  8  9  A  B  C  D  E  F
        /* 0 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 1 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 1 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 3 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 4 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 5 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 6 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 7 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 8 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* 9 */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* A */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* B */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* C */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* D */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* E */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        /* F */ 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 4, 0,
        ];

        this.reset();
    }    

    read(addr){return bus.read(addr);}
    write(addr, data){
        this.write_queue[this.write_queue_length*2    ] = addr;
        this.write_queue[this.write_queue_length*2 + 1] = data;
        this.write_queue_length += 1;
        if(this.write_queue_length > 2) {
            settings_clocks_per_frame = 0;
            console.log('WHATS? ' + this.opcode.toString(16));
        }
    }

    // <Getters, Setters and Converters>
        kill(){ ; } // Placeholder for a function that handles illegal opcodes.
        get16() { return this.read(this.reg.PC++) | (this.read(this.reg.PC++) << 8); }
        makeSigned(val) { return (val & 0x80) ? -(0x100 - val) : val; }
        make16(reg_pair) { return (reg_pair[1] << 8) | reg_pair[0];};
        setZ(val) { this.reg.F = (this.reg.F & 0x70) | (val ? 0x80 : 0x00); }
        setN(val) { this.reg.F = (this.reg.F & 0xB0) | (val ? 0x40 : 0x00); }
        setH(val) { this.reg.F = (this.reg.F & 0xD0) | (val ? 0x20 : 0x00); }
        setC(val) { this.reg.F = (this.reg.F & 0xE0) | (val ? 0x10 : 0x00); }
        getZ() { return (this.reg.F >> 7) & 1; }
        getN() { return (this.reg.F >> 6) & 1; }
        getH() { return (this.reg.F >> 5) & 1; }
        getC() { return (this.reg.F >> 4) & 1; }
    // </Getters, Setters and Converters>

    // <ALU Stuff> ( Register T (Temp) is a special register, used by GB Rhex only, to get and set data from HL-pointer, it makes the ALU logic for that special case simpler. )
        // 8-bit ( reg_pair = register pair (TA, BC, DE, HL); byte = byte from pair (0, 1 = Low or High) )
            // Direct register Arithmetic/Logic Operations
                inc(reg_pair, byte){ // Increment
                    reg_pair[byte] = (reg_pair[byte] + 1) & 0xFF;
                    this.setN(0);
                    this.setH((reg_pair[byte] & 0x0F) === 0x00);
                    this.setZ(reg_pair[byte] === 0);
                }
                dec(reg_pair, byte){ // Decrement
                    reg_pair[byte] = (reg_pair[byte] - 1) & 0xFF;
                    this.setN(1);
                    this.setH((reg_pair[byte] & 0x0F) === 0x0F);
                    this.setZ(reg_pair[byte] === 0);
                }
                rlc(reg_pair, byte){ // Rotate Left,  copy Carry
                    this.setC(reg_pair[byte] & 0x80);
                    const result = ((reg_pair[byte] << 1) | (this.getC()     )) & 0xFF;
                    this.setN(0);
                    this.setH(0);
                    this.setZ(result === 0);
                    reg_pair[byte] = result;
                }
                rrc(reg_pair, byte){ // Rotate Right, copy Carry
                    this.setC(reg_pair[byte] & 0x01);
                    const result = ((reg_pair[byte] >> 1) | (this.getC() << 7)) & 0xFF;
                    this.setN(0);
                    this.setH(0);
                    this.setZ(result === 0);
                    reg_pair[byte] = result;
                }
                rltc(reg_pair, byte){ // Rotate Left,  through Carry
                    const prev_carry = this.getC();
                    this.setC(reg_pair[byte] & 0x80);
                    let result = (reg_pair[byte] << 1) & 0xFF;
                    result |= (prev_carry     );
                    this.setN(0);
                    this.setH(0);
                    this.setZ(result === 0);
                    reg_pair[byte] = result;
                }
                rrtc(reg_pair, byte){ // Rotate Right, through Carry
                    const prev_carry = this.getC();
                    this.setC(reg_pair[byte] & 0x01);
                    let result = (reg_pair[byte] >> 1) & 0xFF;
                    result |= (prev_carry << 7);
                    this.setN(0);
                    this.setH(0);
                    this.setZ(result === 0);
                    reg_pair[byte] = result;
                }
                sla(reg_pair, byte){ // Shift Left,  copy Carry. Insert 0s from Right                    
                    this.setC(reg_pair[byte] & 0x80);
                    const result = (reg_pair[byte] << 1) & 0xFF;

                    this.setN(0);
                    this.setH(0);
                    this.setZ(result === 0);
                    reg_pair[byte] = result;
                }
                sra(reg_pair, byte){ // Shift Right, copy Carry. Insert Bit 7 from Left
                    this.setC(reg_pair[byte] & 0x01);
                    let result = (reg_pair[byte] >> 1) & 0xFF;
                    result |= ((result << 1) & 0x80);
                    this.setN(0);
                    this.setH(0);
                    this.setZ(result === 0);
                    reg_pair[byte] = result;
                }
                srl(reg_pair, byte){ // Shift Right, copy Carry. Insert 0s from Left
                    this.setC(reg_pair[byte] & 0x01);
                    const result = (reg_pair[byte] >> 1) & 0xFF;

                    this.setZ(result === 0);
                    this.setN(0);
                    this.setH(0);
                    reg_pair[byte] = result;
                }
                swap(reg_pair, byte){  // Swap Nibbles
                    const result = ((reg_pair[byte] << 4) | (reg_pair[byte] >> 4)) & 0xFF;
                    this.setZ(result === 0);
                    this.setC(0);
                    this.setN(0);
                    this.setH(0);
                    reg_pair[byte] = result;
                }

            // 'A' register operations
                add(reg_pair, byte, carry){
                    let result = this.reg.TA[0] + reg_pair[byte] + carry;
                    this.setN(0);
                    this.setH(((this.reg.TA[0] & 0x0F) + (reg_pair[byte] & 0x0F) + carry) > 0x0F);
                    this.setC(result > 0xFF);
                    result &= 0xFF;
                    this.setZ(result === 0);
                    this.reg.TA[0] = result;
                }
                sub(reg_pair, byte, carry){
                    let result = this.reg.TA[0] - reg_pair[byte] - carry;
                    this.setN(1);
                    this.setH(((this.reg.TA[0] & 0x0F) - (reg_pair[byte] & 0x0F) - carry) < 0x00);
                    this.setC(result < 0x00);
                    result &= 0xFF;
                    this.setZ(result === 0);
                    this.reg.TA[0] = result;            
                }
                and(reg_pair, byte){
                    let result = (this.reg.TA[0] & reg_pair[byte]) & 0xFF;
                    this.setZ(result === 0);
                    this.setN(0);
                    this.setH(1);
                    this.setC(0);
                    this.reg.TA[0] = result;
                }
                xor(reg_pair, byte){
                    let result = (this.reg.TA[0] ^ reg_pair[byte]) & 0xFF;
                    this.setZ(result === 0);
                    this.setN(0);
                    this.setH(0);
                    this.setC(0); 
                    this.reg.TA[0] = result;
                }
                or(reg_pair, byte){
                    const result = (this.reg.TA[0] | reg_pair[byte]) & 0xFF;
                    this.setZ(result === 0);
                    this.setN(0);
                    this.setH(0);
                    this.setC(0); 
                    this.reg.TA[0] = result;
                }

            // Bitwise Checks (Only change flags)
                cp(reg_pair, byte){
                    const result = this.reg.TA[0] - reg_pair[byte];
                    this.setZ((result & 0xFF) === 0);
                    this.setN(1);
                    this.setH(((this.reg.TA[0] & 0x0F) - (reg_pair[byte] & 0x0F)) < 0);
                    this.setC(result < 0);
                }
                setBit(reg_pair, byte, bit, val){
                    reg_pair[byte] = (reg_pair[byte] & ((1 << bit) ^ 0xFF)) | (val << bit);
                }
                getBit(reg_pair, bit){
                    this.setZ((reg_pair & (1 << bit)) == 0);
                    this.setN(0);
                    this.setH(1);
                }

        // 16-bit
            inc16(reg_pair){
                const result = (((reg_pair[1] << 8) | reg_pair[0]) + 1) & 0xFFFF;
                reg_pair[1] = (result >> 8); reg_pair[0] = (result & 0xFF);
            }
            dec16(reg_pair){
                const result = (((reg_pair[1] << 8) | reg_pair[0]) - 1) & 0xFFFF;
                reg_pair[1] = (result >> 8); reg_pair[0] = (result & 0xFF);
            }
            addhl(reg_pair){
                let   reghl = (this.reg.HL[1] << 8) | (this.reg.HL[0] & 0xFF);
                const reg16 = (   reg_pair[1] << 8) | (   reg_pair[0] & 0xFF);
                this.setH(((reghl & 0x0FFF) + (reg16 & 0x0FFF)) > 0x0FFF);
                this.setC(((reghl         ) + (reg16         )) > 0xFFFF);
                this.setN(0);
                reghl += reg16;
                this.reg.HL[1] = (reghl >> 8) & 0xFF;
                this.reg.HL[0] = (reghl & 0xFF);
            }
            addsp(r8){
                const result = this.reg.SP + this.makeSigned(r8);
                this.setZ(0); 
                this.setN(0); 
                this.setH(((this.reg.SP & 0x0F) + (r8 & 0x0F)) > 0x0F);
                this.setC(((this.reg.SP & 0xFF) + (r8 & 0xFF)) > 0xFF);
                this.reg.SP = result & 0xFFFF; 
            }
            addwsp(r8){
                const result = this.reg.SP + this.makeSigned(r8);
                this.setZ(0); 
                this.setN(0); 
                this.setH(((this.reg.SP & 0x0F) + (r8 & 0x0F)) > 0x0F);
                this.setC(((this.reg.SP & 0xFF) + (r8 & 0xFF)) > 0xFF);
                this.reg.HL[0] = result & 0xFF;
                this.reg.HL[1] = (result >> 8) & 0xFF;
            }

        // DAA Abstraction:
            daa() {
                let a = this.reg.TA[0];
                if(this.getN()){
                    if(this.getH()) { a -= 0x06; if(!this.getC()) a &= 0xFF; }
                    if(this.getC()) { a -= 0x60; }
                }
                else {
                    if(this.getH() || ((a & 0x0F) > 0x09)) { a += 0x06; }
                    if(this.getC() || ( a         > 0x9F)) { a += 0x60; this.setC(1); }
                }
                a &= 0xFF;
                this.setZ(a === 0);
                this.setH(0);
                this.reg.TA[0] = a;
            }
    // </ALU Stuff>

    // <Flow>
        fetch_cbcode(){
            const cbcode = this.read(this.reg.PC++);         
            this.cbcodeTable[cbcode]();
            this.instruction_cycle_count = CBCODES[cbcode].cycles[0];
        }
        jump() { this.reg.PC = this.get16(); }
        jumpRelative() { this.reg.PC += this.makeSigned(this.read(this.reg.PC++)) + 1; }
        ret(){
            this.reg.PC  = (this.read(this.reg.SP++));
            this.reg.PC |= (this.read(this.reg.SP++) << 8);
        }
        call() {
            const call_addr = this.get16();
            this.write(--this.reg.SP, (this.reg.PC >> 8) & 0xFF);
            this.write(--this.reg.SP,  this.reg.PC       & 0xFF);
            this.reg.PC = call_addr;
        }
        pop(reg_pair)  { reg_pair[0] = this.read(this.reg.SP++); reg_pair[1] = this.read(this.reg.SP++); }
        push(reg_pair) { this.write(--this.reg.SP, reg_pair[1]); this.write(--this.reg.SP, reg_pair[0]); }
        rst(f){
            this.write(--this.reg.SP, (this.reg.PC >> 8) & 0xFF);
            this.write(--this.reg.SP,  this.reg.PC       & 0xFF);
            this.reg.PC = f & 0xFF;
        }
        HLPointerGet(){this.reg.TA[1] = this.read(this.make16(this.reg.HL));}
        HLPointerSet(){this.write(this.make16(this.reg.HL), this.reg.TA[1]);}
        requestInterrupt(name) {
            this.reg.IF = (this.reg.IF & (this.interrupt_bits[name] ^ 0xFF)) | (this.interrupt_bits[name]);
        }
    // </Flow>

    reset() {
        this.reg.BC[1] = 0x00; this.reg.BC[0] = 0x13; 
        this.reg.DE[1] = 0x00; this.reg.DE[0] = 0xD8;
        this.reg.HL[1] = 0x01; this.reg.HL[0] = 0x4D;
        this.reg.TA[0] = 0x01;
        this.reg.F     = 0xB0;
        this.reg.SP    = 0xFFFE;
        this.reg.PC    = 0x0100;
    }

    step()  ////////////////////////////////////////////////////////////////////////////////////////////// MAGIC //
    {
        if((this.reg.IF & this.reg.IE) > 0) {this.halted = false;}
        if(this.instruction_elapsed_cycles >= this.instruction_cycle_count) // Ready to do a new instruction
        {
            this.instruction_elapsed_cycles = 0;
            this.instruction_cycle_count = 24;            
            if((((this.reg.IF & this.reg.IE) & 0x1F) > 0) && (this.reg.IME == 1)) // Interrupt Pending.
            {
                for(let i = 0; i < 5; i++)
                {
                    if((this.reg.IF & this.reg.IE) & (1 << i))
                    {
                        this.reg.IME = 0;
                        this.reg.IF ^= (1 << i);                              
                        bus.write(--this.reg.SP, (this.reg.PC >> 8) & 0xFF);  
                        bus.write(--this.reg.SP,  this.reg.PC       & 0xFF);
                        this.reg.PC = this.interrupt_addresses[i];
                        this.instruction_cycle_count = 44;
                        break;
                    }
                } 
            }            
            this.opcode = this.read((this.reg.PC++) & 0xFFFF);
            this.reg.PC &= 0xFFFF;
            this.reg.SP &= 0xFFFF;

            if(this.opcode === 0xCB) {
                this.read_cycle = this.cbtiming_read[this.read(this.reg.PC)];
                this.write_cycle = this.read_cycle + this.cbtiming_write[this.read(this.reg.PC)];
            }
            else {
                this.read_cycle = this.optiming_read[this.opcode];
                this.write_cycle = this.read_cycle + this.optiming_write[this.opcode];
            }
        }

        if(this.instruction_elapsed_cycles === this.read_cycle)
        {
            this.write_queue_length = 0;
            this.condition_was_false = 0;
            this.opcodeTable[this.opcode]();
            if(this.opcode != 0xCB) // otherwise, the fetch_cbcode() function will get us the value.
                this.instruction_cycle_count = OPCODES[this.opcode].cycles[this.condition_was_false];
        }

        if(this.instruction_elapsed_cycles === this.write_cycle)
        {
            if(this.write_queue_length > 0)
                bus.write(this.write_queue[0], this.write_queue[1]);

            if(this.write_queue_length > 1)
                bus.write(this.write_queue[2], this.write_queue[3]);
        }

        //if(!this.halted) 
            this.instruction_elapsed_cycles++;
    }
    ///////////////////////////////////////////////////////////////////////////////////////////////////// MAGIC //
    
} const cpu = new SM83();
