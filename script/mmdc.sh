#!/bin/bash
# get all filename in specified path

path=$1
files=$(ls $path/*.mmd)
for filename in $files
do
   npx mmdc -i $filename
done