mkdir ./json
mkdir ./txt

./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_TEST}/${TEST_ENV_FILE}" ./.env
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_TEST}/${TEST_SECRETS_FILE}" ./client_secrets.json
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_TEST}/${TEST_JSON_FILE}" ./privatekey.json
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_TEST}/${TEST_USER_GCP_KEY}" ./
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_TEST}/${TEST_DCF_SECRETS_FILE}" ./dcf_secrets.txt

./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_TEST}/${SERVICE_ACCOUNT_BLACKLIST_JSON_FILE}" ./
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_TEST}/${GOOGLE_ORG_WHITELIST_JSON_FILE}" ./
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_TEST}/${MANAGED_SERVICE_ACCOUNTS_JSON_FILE}" ./
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_TEST}/${TEST_DATASET_JSON_FILE}" ./

./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_TEST}/${STATIC_COMMIT_CHECK_FILE}" ./

if [ -n "${TEST_NIH_AUTH_ON}" ]; then
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_TEST}/saml/advanced_settings.json" ./saml/advanced_settings.json
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_TEST}/saml/settings.json" ./saml/settings.json
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_TEST}/saml/certs/cert.pem" ./saml/certs/cert.pem
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_TEST}/saml/certs/key.pem" ./saml/certs/key.pem
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_TEST}/NIH_FTP.txt" ./NIH_FTP.txt
fi

# Pack staged files for caching
echo "Packing JSON and text files for caching into deployment..."
cp --verbose *.json ./json
cp --verbose *.txt ./txt

