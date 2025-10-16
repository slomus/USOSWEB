package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
)

// EncryptAESGCMBase64 encrypts plaintext with AES-GCM using the provided 32-byte key.
func EncryptAESGCMBase64(plaintext string, key []byte) (string, error) {
	if len(key) != 32 {
		return "", errors.New("invalid key length: require 32 bytes")
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptAESGCMBase64 decrypts base64-encoded AES-GCM ciphertext using the provided 32-byte key.
func DecryptAESGCMBase64(ciphertextB64 string, key []byte) (string, error) {
	if len(key) != 32 {
		return "", errors.New("invalid key length: require 32 bytes")
	}
	data, err := base64.StdEncoding.DecodeString(ciphertextB64)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(data) < gcm.NonceSize() {
		return "", errors.New("ciphertext too short")
	}
	nonce := data[:gcm.NonceSize()]
	ciphertext := data[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}

// ParseKey accepts either a raw 32-byte string key or a base64-encoded key that decodes to 32 bytes.
func ParseKey(keyString string) ([]byte, error) {
	// direct bytes
	if len(keyString) == 32 {
		return []byte(keyString), nil
	}
	// try base64
	decoded, err := base64.StdEncoding.DecodeString(keyString)
	if err == nil && len(decoded) == 32 {
		return decoded, nil
	}
	return nil, errors.New("invalid key: provide 32-byte raw or base64-encoded 32-byte key")
}
