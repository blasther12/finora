# Domínio financeiro

- Conta representa dinheiro existente; reserva não é caixa operacional e seu valor canônico fica em `CashReserve`.
- Compra no cartão é despesa e entra em uma fatura resolvida pelo backend. O fechamento é exclusivo: compra no dia de fechamento pertence ao ciclo seguinte.
- Pagamento de fatura é uma saída de caixa marcada como transferência excluída do orçamento.
- Transferência gera duas pernas atômicas ligadas pelo mesmo grupo, sem receita/despesa.
- Orçamento é calculado pelas compras na data da transação, inclusive cartão.
- Recorrências mensais, semanais e anuais materializam transações projetadas com chave única `(recurringTransactionId, transactionDate)` e atualizam a fatura quando a origem é cartão.
- Parcelamentos materializam parcelas e transações projetadas; quando o total tem diferença de arredondamento, ela é absorvida pela última parcela para preservar a soma exata.
- Projeção separa valores `PROJECTED` de `CONFIRMED`/`PAID`.
- A fatura consolidada usa `CardBill.currentAmount` como valor canônico, inclusive para importações sem itens detalhados. Pagá-la movimenta caixa uma única vez.
