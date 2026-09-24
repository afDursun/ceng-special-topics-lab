def gf_mul(a, b):
    """GF(2^8) çarpımı; AES indirgeme polinomu 0x11b."""
    result = 0
    for _ in range(8):
        if b & 1:
            result ^= a
        a = ((a << 1) ^ (0x11b if a & 0x80 else 0)) & 0xff
        b >>= 1
    return result


def make_sbox():
    def inverse(x):
        if x == 0:
            return 0
        y = 1
        for _ in range(254):
            y = gf_mul(y, x)
        return y

    def rotate(x, n):
        return ((x << n) | (x >> (8 - n))) & 255

    table = []
    for x in range(256):
        y = inverse(x)
        table.append(y ^ rotate(y, 1) ^ rotate(y, 2) ^ rotate(y, 3) ^ rotate(y, 4) ^ 0x63)
    return table


SBOX = make_sbox()
INV_SBOX = [SBOX.index(x) for x in range(256)]


def sub_bytes(state, inverse=False):
    table = INV_SBOX if inverse else SBOX
    return [table[x] for x in state]


def shift_rows(state, inverse=False):
    # Sütun öncelikli: state[4 * sütun + satır].
    direction = -1 if inverse else 1
    return [state[4 * ((c + direction * r) % 4) + r]
            for c in range(4) for r in range(4)]


def mix_columns(state, inverse=False):
    matrix = ([[14, 11, 13, 9], [9, 14, 11, 13],
               [13, 9, 14, 11], [11, 13, 9, 14]] if inverse else
              [[2, 3, 1, 1], [1, 2, 3, 1], [1, 1, 2, 3], [3, 1, 1, 2]])
    result = []
    for c in range(4):
        column = state[4*c:4*c+4]
        for row in matrix:
            value = 0
            for coefficient, byte in zip(row, column):
                value ^= gf_mul(coefficient, byte)
            result.append(value)
    return result


def add_round_key(state, key):
    return [a ^ b for a, b in zip(state, key)]


def expand_key(key):
    if len(key) != 16:
        raise ValueError("AES-128 anahtarı tam 16 bayt olmalı.")
    words = [list(key[i:i+4]) for i in range(0, 16, 4)]
    rcon = 1
    for i in range(4, 44):
        temp = words[i-1].copy()
        if i % 4 == 0:
            temp = temp[1:] + temp[:1]  # RotWord
            temp = [SBOX[x] for x in temp]  # SubWord
            temp[0] ^= rcon
            rcon = gf_mul(rcon, 2)
        words.append([a ^ b for a, b in zip(words[i-4], temp)])
    return [sum(words[i:i+4], []) for i in range(0, 44, 4)]


def crypt_block(block, key, decrypt=False):
    if len(block) != 16:
        raise ValueError("AES bloğu tam 16 bayt olmalı.")
    keys = expand_key(key)
    state = list(block)
    trace = []

    def record(name, round_no, before, after, round_key=None):
        trace.append(dict(name=name, round=round_no, before=list(before),
                          after=list(after), key=round_key))

    def apply(name, round_no, operation, round_key=None):
        nonlocal state
        before = state.copy()
        state = operation(state)
        record(name, round_no, before, state, round_key)

    record("Şifreli blok" if decrypt else "Dolgulu blok", 10 if decrypt else 0, state, state)
    if not decrypt:
        apply("AddRoundKey", 0, lambda s: add_round_key(s, keys[0]), keys[0])
        for r in range(1, 11):
            apply("SubBytes", r, sub_bytes)
            apply("ShiftRows", r, shift_rows)
            if r != 10:
                apply("MixColumns", r, mix_columns)
            apply("AddRoundKey", r, lambda s: add_round_key(s, keys[r]), keys[r])
    else:
        apply("AddRoundKey", 10, lambda s: add_round_key(s, keys[10]), keys[10])
        for r in range(9, -1, -1):
            apply("InvShiftRows", r, lambda s: shift_rows(s, True))
            apply("InvSubBytes", r, lambda s: sub_bytes(s, True))
            apply("AddRoundKey", r, lambda s: add_round_key(s, keys[r]), keys[r])
            if r != 0:
                apply("InvMixColumns", r, lambda s: mix_columns(s, True))
    return bytes(state), trace


def pad(data):
    n = 16 - len(data) % 16
    return data + bytes([n]) * n


def unpad(data):
    if not data or len(data) % 16:
        raise ValueError("Geçersiz dolgulu veri.")
    n = data[-1]
    if not 1 <= n <= 16 or data[-n:] != bytes([n]) * n:
        raise ValueError("Geçersiz PKCS#7 dolgusu.")
    return data[:-n]


def aes_encrypt(text, key):
    data = pad(text.encode("utf-8"))
    return b"".join(crypt_block(data[i:i+16], key)[0] for i in range(0, len(data), 16))


def aes_decrypt(ciphertext, key):
    if not ciphertext or len(ciphertext) % 16:
        raise ValueError("Şifreli veri 16 baytın pozitif katı olmalı.")
    data = b"".join(crypt_block(ciphertext[i:i+16], key, True)[0]
                    for i in range(0, len(ciphertext), 16))
    return unpad(data).decode("utf-8")


def show_state(state):
    for r in range(4):
        print(" ".join(f"{state[4*c+r]:02x}" for c in range(4)))
