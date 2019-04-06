import requests
import json
from base64 import b64decode, b64encode

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
    def revoke(label, bvk):
        request = {}
        request["label"] = label
        request["bob_verifying_key"] = bvk

        response = requests.delete(f"{Alice.alice}/revoke", data=json.dumps(request))
        return response #.status_code == 200

    @staticmethod
    def encrypt(label, message):
        request = {}
        request["label"] = label
        request["message"] = message

        response = requests.put(f"{Alice.alice}/encrypt", data=json.dumps(request))
        encrypted = json.loads(response.content)['result']['message_kit']
        return encrypted


# if __name__ == '__main__':
#   message_kit = Alice.encrypt('hello', 'more')
#   print(message_kit)
