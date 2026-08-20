# Domínio financeiro

- Conta representa dinheiro existente; reserva não é caixa operacional.
- Compra no cartão é despesa e entra em uma fatura resolvida pelo backend. O fechamento é exclusivo: compra no dia de fechamento pertence ao ciclo seguinte.
- Pagamento de fatura é uma saída de caixa marcada como transferência excluída do orçamento.
- Transferência gera duas pernas atômicas ligadas pelo mesmo grupo, sem receita/despesa.
- Orçamento é calculado pelas compras na data da transação, inclusive cartão.
- Recorrências materializam transações projetadas com chave única `(recurringTransactionId, transactionDate)`.
- Projeção separa valores `PROJECTED` de `CONFIRMED`/`PAID`.
