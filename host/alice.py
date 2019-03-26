import requests
import json
from base64 import b64decode, b64encode

from pyUmbral.umbral.keys import UmbralPublicKey
from nucypher.characters.lawful import Enrico

class Alice(object):
  alice = "http://localhost:8151"

  @staticmethod
  def get_verifying_key():
    response = requests.get(f"{Alice.alice}/public_keys")
    json_response = json.loads(response.content)
    return json_response['result']['alice_verifying_key']

  @staticmethod
  def get_policy_encrypting_key(label):
    response = requests.post(f"{Alice.alice}/derive_policy_encrypting_key/{label}")
    json_response = json.loads(response.content)
    return json_response['result']['policy_encrypting_key']

  @staticmethod
  def encrypt(label, message):
    plaintext = bytes(message, encoding='utf-8')

    policy_encrypting_key = Alice.get_policy_encrypting_key(label)
    encrypting_key = UmbralPublicKey.from_bytes(bytes.fromhex(policy_encrypting_key))

    ENRICO = Enrico(policy_encrypting_key=encrypting_key)
    ciphertext, signature = ENRICO.encrypt_message(plaintext)

    return b64encode(ciphertext.to_bytes()).decode()


# if __name__ == '__main__':
#   message_kit = Alice.encrypt('hello', 'more')
#   print(message_kit)
