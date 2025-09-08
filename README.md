# Atividade prática #01 — Sensores de Futebol em Tempo Real

Simula sensores em jogadores (bpm, velocidade, posição) e envia os dados **em tempo real** via **Socket.IO**.  
Cada **room** representa um jogador. O cliente assina uma room e passa a receber as amostras daquele jogador.

## Rodando

```bash
# 1) entre na pasta
cd Atividade-Pratica-01-TA

# 2) instale as dependências
npm install

# 3) rode o servidor (com recarregamento automático)
npm run dev
# ou sem nodemon
npm start
```

Acesse: **http://localhost:3000**
