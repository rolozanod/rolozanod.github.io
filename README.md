# [!rolozanod.github.io](https://github.com/rolozanod/)
Public web page hosted in Github to showcase my work on ML and optimization.

[!Noah's Hugo instructions](https://d3c33hcgiwev3.cloudfront.net/vTjJyofrQS24ycqH6zEt4w_a72aad10ea7c4f5f9f10f63d8df4801f_Continuous-Delivery-for-Hugo-Static-Site-from-Zero.pdf?Expires=1644710400&Signature=DfXb20Lth8hv3hJbkKLPlSvvaZXYqQVBozXhOMIfPm~P7zGvdhMKAF7lTNrXPdHpC6EUUt0t~NyzMfwVEk1BftFhNLDEEhpmeJOLRUKbq7mjSidTcdZw5jazwYCuatHmM9vws8FX46M3md9SNn2MvnVaJSQ56nOOV~ZfuBtCR5M_&Key-Pair-Id=APKAJLTNE6QMUY6HBC5A)

# SETUP #

1. docker build --tag gitwebsite .
2. docker run --name gitwebsite --mount type=bind,source="$(pwd)"/,target=/app --rm -i -t gitwebsite hugo new site gitsite
3. sudo chown -R $USER gitsite/
4. cd gitsite/
5. git submodule add https://github.com/budparr/gohugo-theme-ananke.git themes/ananke
6. git submodule update --recursive
7. docker run --name gitwebsite --mount type=bind,source="$(pwd)"/,target=/app --rm -i -t gitwebsite echo 'theme = "ananke"' >> config.toml
8. docker run --name gitwebsite --mount type=bind,source="$(pwd)"/,target=/app --rm -i -t gitwebsite hugo new posts/my-first-post.md
9. docker run --name gitwebsite --mount type=bind,source="$(pwd)"/,target=/app --rm -i -t gitwebsite hugo
10. cd public