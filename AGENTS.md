# Finora engineering rules

1. Nunca utilizar float para dinheiro; valores financeiros usam Decimal.
2. Nunca colocar regras financeiras críticas no frontend.
3. Controllers não contêm regras de negócio.
4. Pagamento de fatura não representa nova despesa.
5. Transferência entre contas não representa receita ou despesa.
6. Limite de cartão não representa dinheiro disponível.
7. Compra no cartão impacta o orçamento na data da compra, não no pagamento.
8. Reserva financeira é separada do dinheiro operacional.
9. Dados projetados e confirmados são claramente distintos.
10. Correções manuais prevalecem sobre projeções automáticas.
11. Toda nova regra financeira possui testes.
12. Transações financeiras não são apagadas fisicamente sem necessidade; use cancelamento/soft delete.
13. Modelos Prisma não são contratos da API; DTOs e responses são explícitos.
14. Entidades financeiras mantêm createdAt e updatedAt.
15. Operações críticas usam transação de banco.
16. Não criar dependência circular entre módulos.
17. A aplicação permanece um monólito modular.
