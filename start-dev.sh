#!/bin/bash
export NVM_DIR="/Users/virgilcaffier/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
exec npm run dev
