#!/bin/bash

docker build . -t gcr.io/mechmania2017/stanchion:latest
docker push gcr.io/mechmania2017/stanchion:latest
kubectl apply -f app.yaml
kubectl delete pods -l app=stanchion