#!/usr/bin/env bash

set -e

# Define helper function for logging
info() {
    echo "$(date +"%Y-%m-%d %T") [INFO]"
}

# Define helper function for logging. This will change the Error text color to red
error() {
    echo "$(date +"%Y-%m-%d %T") [ERROR]"
}

exitWithError() {
    # Reset console color
    exit 1
}


echo "$(info) Installing dotnet SDK"
wget https://dot.net/v1/dotnet-install.sh
bash ./dotnet-install.sh
export DOTNET_ROOT=/root/.dotnet


echo "$(info) Getting JWT Token Issuer from source"
#git clone https://github.com/Azure-Samples/video-analyzer-iot-edge-csharp.git 
curl -O "$JWT_TOKEN_PACKAGE"
unzip jwt-token-issuer.zip -d jwt-token-issuer
cd jwt-token-issuer  

#echo "$() getting known working commit id"
#cd video-analyzer-iot-edge-csharp
#git checkout 0daf555aae68559851f91bbafeaba4caf62c5a9a


echo "$(info) Building JWT Token Issuer App"
/root/.dotnet/dotnet build

cd bin/Debug/netcoreapp3.1/

# Generate self-signed certificates
echo "$(info) Generating self-signed certificates"
openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -subj "/CN=contoso.com" -out certificate.pem
openssl pkcs12 -inkey key.pem -in certificate.pem -export -out certificate.p12 -passout pass:

# Generating JWT Token
echo "$(info) Generating JWT Token"
./JwtTokenIssuer --audience=https://videoanalyzer.azure.net/videos/ --issuer=https://contoso.com --expiration=2120-01-01T00:00:00.000Z --certificatePath=certificate.p12 > config.txt

# Saving JWT Token details
echo "$(info) Parsing information for AVA Access Policy"
AVA_ISSUER=$(awk '/Issuer: :/{print $NF}' config.txt)
AVA_AUDIENCE=$(awk '/Audience: :/{print $NF}' config.txt)
AVA_KEY_TYPE=$(awk '/Key Type: :/{print $NF}' config.txt)
AVA_ALGORITHM=$(awk '/Key Id: :/{print $NF}' config.txt)
AVA_KEY_ID=$(awk '/Key Id: :/{print $NF}' config.txt)
AVA_RSA_KEY_MODULUS=$(awk '/RSA Key Modulus \(n\): :/{print $NF}' config.txt)
AVA_RSA_KEY_EXPONENT=$(awk '/RSA Key Exponent \(e\): :/{print $NF}' config.txt)
AVA_JWT_TOKEN=$(awk '/Token: :/{print $NF}' config.txt)

OUTPUT_JSON=$(jq -n \
	--arg  AVA_ISSUER "$AVA_ISSUER" \
	--arg  AVA_AUDIENCE "$AVA_AUDIENCE" \
	--arg  AVA_KEY_TYPE "$AVA_KEY_TYPE" \
	--arg  AVA_ALGORITHM "$AVA_ALGORITHM" \
	--arg  AVA_KEY_ID "$AVA_KEY_ID" \
	--arg  AVA_RSA_KEY_MODULUS "$AVA_RSA_KEY_MODULUS" \
	--arg  AVA_RSA_KEY_EXPONENT "$AVA_RSA_KEY_EXPONENT" \
	--arg  AVA_JWT_TOKEN "$AVA_JWT_TOKEN" \
	'{Issuer: $AVA_ISSUER, Audience: $AVA_AUDIENCE, KeyType: $AVA_KEY_TYPE, Algorithm: $AVA_ALGORITHM, KeyId: $AVA_KEY_ID, RSAKeyModulus: $AVA_RSA_KEY_MODULUS, RSAKeyExponent: $AVA_RSA_KEY_EXPONENT, JwtToken: $AVA_JWT_TOKEN}')

# Saving output for downstream steps
echo "$(info) Saving outputs for downstream ARM Template Steps"
echo "$OUTPUT_JSON" > "$AZ_SCRIPTS_OUTPUT_PATH"
