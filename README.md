# Mesaj Tahtası

Ethereum üzerinde küçük bir not panosu. Cüzdanla bağlanırsın, notunla birlikte küçük bir ETH gönderirsin, not kontratın içinde kalır. Biriken ücreti yalnızca tahtayı deploy eden adres çekebilir.

![Mesaj Tahtası](screenshots/tahta.png)

![Zincirdeki notlar](screenshots/notlar.png)

## Nasıl çalışır

- Not yazmak `post` işlevidir. En az `0.0001 ETH` gerekir. Boş not ve 280 baytı aşan not kabul edilmez.
- Notu yazan adres `msg.sender` olarak saklanır. Tahtanın sahibi, kontratı deploy eden adrestir.
- Notları okumak bir `view` çağrısıdır ve cüzdan onayı istemez.
- Yazmak, cüzdanın imzaladığı bir işlemdir. Nota eklenen ETH kontratta birikir. Ağın kestiği gas bu bakiyeye girmez.
- `withdraw` yalnızca sahibindir. Başkası çağırırsa işlem geri döner. Notlar silinmez.

Kurallar `contracts/MessageBoard.sol` içindedir.

## Çalıştırma

Node.js gerekir. İki terminal aç.

Birincide:

```powershell
npm install
npm test
npm run node
```

İkincide:

```powershell
npm run deploy:local
npm run dev
```

Tarayıcıda [http://127.0.0.1:5173](http://127.0.0.1:5173) açılır. MetaMask'a şu ağı ekle:

- Ağ adı: Hardhat Local
- RPC: `http://127.0.0.1:8545`
- Zincir numarası: `31337`
- Sembol: ETH

`npm run node` açılınca hesaplar terminale yazılır. İlk hesap tahtanın sahibidir. O hesabı cüzdana eklersen ücreti çekme düğmesi görünür. Başka bir hesapla girersen düğme çıkmaz.

Bu anahtar yalnızca kendi bilgisayarındaki yerel ağ içindir. Başka bir ağda veya gerçek parayla kullanma.

`npm run node` kapanınca yerel zincir silinir. Tekrar deploy etmek gerekir.

## Sepolia

Aynı tahtayı test ağına almak için:

1. `.env.example` dosyasını `.env` yap.
2. Yalnızca test için kullandığın bir hesabın özel anahtarını `PRIVATE_KEY` alanına yaz. `.env` repoya girmez.
3. [Sepolia musluğu](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) ile o hesaba test ETH al.
4. `npm run deploy:sepolia` çalıştır.
5. `npm run dev` ile sayfayı aç, MetaMask'ta Sepolia'yı seç.

Deploy, kontrat adresini `frontend/src/config.js` içine yazar.

## Dosyalar

- `contracts/MessageBoard.sol` — zincirdeki kurallar
- `test/MessageBoard.js` — ücret, boş not, uzun not ve sahip çekimi
- `frontend/` — cüzdanın konuştuğu sayfa

## Sınır

Not listesinin tamamı tek çağrıda okunur. Birkaç not için yeter. Çok sayıda notta bu çağrı pahalılaşır; o ölçekte sayfalama gerekir.
