#!/bin/bash

unlink ./chrome/shared
unlink ./firefox/data/shared

ln -s ../shared ./chrome/shared
ln -s ../../shared ./firefox/data/shared
