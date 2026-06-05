FROM grafana/k6:latest
COPY run-test.js /scripts/run-test.js
ENTRYPOINT ["k6", "run", "/scripts/run-test.js"]
