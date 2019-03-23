#!/usr/bin/env python
# Copyright (c) 2012 The Chromium Authors. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

# A simple native messaging host.

import struct
import sys
import json

# Helper function that sends a message to the webapp.
def send_message(message):
  # Write message size.
  sys.stdout.write(struct.pack('I', len(message)))
  # Write the message itself.
  sys.stdout.write(message)
  sys.stdout.flush()

def escape_message(message):
  return "\"" + message + "\""

# Thread that reads messages from the webapp.
def read_thread_func():
  message_number = 0
  while 1:
    # Read the message length (first 4 bytes).
    text_length_bytes = sys.stdin.read(4)
    if len(text_length_bytes) == 0:
      sys.exit(0)

    # Unpack message length as 4 byte integer.
    text_length = struct.unpack('i', text_length_bytes)[0]

    # Read the text (JSON object) of the message.
    text = sys.stdin.read(text_length).decode('utf-8')
    abc = json.loads(text)
    send_message('{"id": %s}' % (escape_message(abc['id'])))

if __name__ == '__main__':
  read_thread_func()
  sys.exit(0)
