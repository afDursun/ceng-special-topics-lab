from math import gcd

ALPHABET = "abcçdefgğhıijklmnoöprsştuüvyz"

def encode_text(text):
    values = []
    for character in text.lower():
        if character not in ALPHABET:
            raise ValueError(f"Bu örnekte desteklenmeyen karakter: {character!r}")
        values.append(ALPHABET.index(character))
    return values

def decode_values(values):
    if any(not isinstance(value, int) or not 0 <= value < len(ALPHABET) for value in values):
        raise ValueError("Çözülen değer Türk alfabesi aralığında değil.")
    return "".join(ALPHABET[value] for value in values)

def make_keys(p=3, q=11, e=3):
    n = p * q
    phi = (p - 1) * (q - 1)
    if gcd(e, phi) != 1:
        raise ValueError("e ile φ(n) aralarında asal olmalı.")
    d = pow(e, -1, phi)
    return dict(p=p, q=q, n=n, phi=phi, e=e, d=d)

def encrypt(text, keys):
    return [pow(value, keys["e"], keys["n"]) for value in encode_text(text)]

def decrypt(ciphertext, keys):
    values = [pow(value, keys["d"], keys["n"]) for value in ciphertext]
    return decode_values(values)

def power_steps(base, exponent, modulus):
    result = 1
    trace = []
    for bit in bin(exponent)[2:]:
        before = result
        squared = before * before
        square_remainder = squared % modulus
        product = square_remainder * base if bit == "1" else None
        result = product % modulus if product is not None else square_remainder
        trace.append(dict(bit=bit, before=before, squared=squared,
                          square_remainder=square_remainder,
                          product=product, after=result))
    return result, trace
