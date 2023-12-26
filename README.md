# Let's go

```
npm run build
```

# Crypto
... as in cryptography, not cryptocurrency. (eww)

- [go here to encrypt things](https://gchq.github.io/CyberChef/#recipe=Register('salt:%20(.*)$',true,true,false)Register('iv:%20(.*)$',true,true,false)Register('passwd:%20(.*)$',true,true,false)Register('meta%20id:%20(.*)$',true,true,false)Register('%3D-%3D-%3D%5C%5Cn(%5B%5C%5Cs%5C%5CS%5D*)$',true,false,false)Find_/_Replace(%7B'option':'Regex','string':'.*'%7D,'',true,false,true,true)Derive_PBKDF2_key(%7B'option':'UTF8','string':'$R2'%7D,256,100000,'SHA256',%7B'option':'Base64','string':'$R0'%7D)Register('(%5B%5C%5Cs%5C%5CS%5D*)',true,false,false)Find_/_Replace(%7B'option':'Regex','string':'%5E.*$'%7D,'$R4',true,false,false,true)AES_Encrypt(%7B'option':'Hex','string':'$R5'%7D,%7B'option':'Base64','string':'$R1'%7D,'GCM','Raw','Hex',%7B'option':'Hex','string':''%7D)Find_/_Replace(%7B'option':'Regex','string':'%5E(%5Ba-f0-9%5D%2B)$%5C%5Cs*%5ETag:%20(%5B0-9a-f%5D%2B)'%7D,'%3Cmeta%20name%3D%22encryption-info%22%20id%3D%22$R3%22%20data-salt%3D%22$R0%22%20data-init%3D%22$R1%22%20data-hash%3D%22SHA-256%22%20data-tag%3D%22$2%22%20data-iterations%3D%22100000%22%3E%5C%5Cn%5C%5Cn$1',true,false,true,false)&input=R2VuZXJhdGUgc29tZSBjcnlwdG9ncmFwaGljYWxseS1zZWN1cmUgcmFuZG9tcyBmb3IgdGhlIFNhbHQgYW5kIElWLCB0aGVuIGRlY2lkZSBvbiBhIHBhc3N3b3JkCmFuZCBtZXRhIElELiBzYWx0IGFuZCBpdiBhcmUgYmFzZTY0J2QsICJtZXRhIGlkIiBpcyBhIEhUTUwtY29tcGF0aWJsZSBJRCwgYW5kIHBhc3N3ZCBpcyBhbnl0aGluZyB0aGF0IHdvcmtzCndpdGhpbiBhIEhUTUwgPGlucHV0PiBlbGVtZW50LgorLS0tIHNpemUgKGJ5dGVzKQp2CjMyICBzYWx0OiAKMTIgICAgaXY6IAogIHBhc3N3ZDogY2hvb3NlIHNvbWV0aGluZyBzZWN1cmUhIG9yIGljb25pYyEgb3IgYW55dGhpbmcgZWxzZSEKIG1ldGEgaWQ6IAo9LT0tPQpIVE1MIGdvZXMgaGVyZS4)
- add `?nocrypt` to URLs with encrypted content to recieve CyberChef decryption recipe