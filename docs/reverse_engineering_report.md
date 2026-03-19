# Atlas Finance — Relatório de Engenharia Reversa das Planilhas

**Data de geração:** 2026-03-19
**Fase:** 1 — Descoberta e Engenharia Reversa

---

## 1. Resumo Executivo

| Métrica | Valor |
|---|---|
| Total de arquivos analisados | 10 |
| Total de abas analisadas | 139 |
| Total de células com fórmula | 37941 |
| Total de células com valor numérico (input) | 19943 |
| Referências externas detectadas | 547 |

---

## 2. Estrutura dos Arquivos

### `Orçamento 16.0 - Unidade Laboratório (Alav.).xlsx`

**Abas (17):** `Orçamento`, `Custo investimento Lab`, `Financiamento`, `Água e luz`, `Cálcul. trabalhado`, `Ocupação e unit economics 2.0`, `Cálculo kit higiene`, `Equipe`, `Orçamento máquinas`, `Cronog. de Ativ. `, `Cálcul. para definição benefic`, `Fórmulas fee para split`, `Benefícios Personal`, `Benefícios aluno`, `Manifesto`, `Concorrentes`, `Local`

#### Aba: `Orçamento`

- Fórmulas: **5175**
- Inputs numéricos: **2544**
- Labels/Cabeçalhos: **257**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Item
- `B1`: Receita
- `C1`: 2026-08-01 00:00:00
- `D1`: 2026-09-01 00:00:00
- `E1`: 2026-10-01 00:00:00
- `F1`: 2026-11-01 00:00:00
- `G1`: 2026-12-01 00:00:00
- `H1`: 2027-01-01 00:00:00
- `I1`: 2027-02-01 00:00:00
- `J1`: 2027-03-01 00:00:00
- `K1`: 2027-04-01 00:00:00
- `L1`: 2027-05-01 00:00:00
- `M1`: 2027-06-01 00:00:00
- `N1`: 2027-07-01 00:00:00
- `O1`: 2027-08-01 00:00:00
- `P1`: 2027-09-01 00:00:00
- `Q1`: 2027-10-01 00:00:00
- `R1`: 2027-11-01 00:00:00
- `S1`: 2027-12-01 00:00:00
- `T1`: Total Acumulado Ano 1

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F2` | `=('Cálcul. trabalhado'!I3)/2` |  |
| `G2` | `=F2*2` |  |
| `H2` | `='Cálcul. trabalhado'!I4` |  |
| `I2` | `=H2` |  |
| `J2` | `=I2` |  |
| `K2` | `=J2` |  |
| `L2` | `=K2` |  |
| `M2` | `=L2` |  |
| `N2` | `=M2` |  |
| `O2` | `=N2` |  |
| `P2` | `=O2` |  |
| `Q2` | `=P2` |  |
| `R2` | `=Q2` |  |
| `S2` | `=R2` |  |
| `T2` | `=SUM(F2:S2)` |  |

#### Aba: `Custo investimento Lab`

- Fórmulas: **8**
- Inputs numéricos: **5**
- Labels/Cabeçalhos: **2**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Inestimento - Unidade 1 laboratório
- `A8`: Total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=Financiamento!C7+Financiamento!C8` |  |
| `D3` | `=Financiamento!C10` |  |
| `J3` | `=J2*J4` |  |
| `J4` | `=AVERAGE(Orçamento!C10:N10)` |  |
| `D7` | `=J3+J7` |  |
| `J7` | `=-(J6*J8)` |  |
| `D8` | `=SUM(D2:E7)` |  |
| `J8` | `=AVERAGE(Orçamento!F5:N5)` |  |

#### Aba: `Financiamento`

- Fórmulas: **45**
- Inputs numéricos: **28**
- Labels/Cabeçalhos: **7**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D22`: Máquinas
- `E22`: Pesos livres
- `F22`: Imóvel
- `G22`: Arquit.
- `H22`: Branding
- `B29`: R$ Parcela
- `B30`: Total Parcelamento

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `E2` | `=C2*D2` |  |
| `F2` | `=F29` |  |
| `G2` | `=E2*30%` |  |
| `H2` | `=E2-G2` |  |
| `E3` | `=D3*C2` |  |
| `B5` | `=SUM(B6:B9)` |  |
| `D6` | `=C6*B6` |  |
| `F6` | `=E6*D6` |  |
| `G6` | `=D6-F6` |  |
| `C7` | `='Orçamento máquinas'!W40` |  |
| `D7` | `=C7*B7` |  |
| `F7` | `=E7*D7` |  |
| `G7` | `=D7-F7` |  |
| `H7` | `=D29` |  |
| `D8` | `=C8*B8` |  |

#### Aba: `Água e luz`

- Fórmulas: **75**
- Inputs numéricos: **20**
- Labels/Cabeçalhos: **18**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Energia
- `B1`: Valor
- `F1`: Síntese
- `F2`: Ano
- `G2`: Ocupação
- `H2`: Energia
- `I2`: Água
- `J2`: Total
- `A6`: Ocupação
- `B6`: Parcela fixa
- `C6`: Parcela variável
- `D6`: Energia total
- `A14`: Água
- `B14`: Valor
- `A18`: Ocupação
- `B18`: Parcela fixa
- `C18`: Parcela variável
- `D18`: Água total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D7` |  |
| `I3` | `=D19` |  |
| `J3` | `=H3+I3` |  |
| `H4` | `=D8` |  |
| `I4` | `=D20` |  |
| `J4` | `=H4+I4` |  |
| `H5` | `=D9` |  |
| `I5` | `=D21` |  |
| `J5` | `=H5+I5` |  |
| `H6` | `=D10` |  |
| `I6` | `=D22` |  |
| `J6` | `=H6+I6` |  |
| `A7` | `='Cálcul. trabalhado'!H4` |  |
| `B7` | `=B2` |  |
| `C7` | `=B3*A7` |  |

#### Aba: `Cálcul. trabalhado`

- Fórmulas: **73**
- Inputs numéricos: **73**
- Labels/Cabeçalhos: **40**
- Referências externas: **1**

**Principais labels/cabeçalhos detectados:**

- `F1`: Aluno por Hora
- `G1`: 10
- `H1`: Tx de Ocupação (% Hs)
- `I1`: Res. Mensal
- `F2`: Meta
- `A3`: 2026
- `B3`: Semana
- `D3`: Sábado
- `F3`: Meta
- `F4`: Meta
- `F5`: Meta
- `F6`: Meta
- `F7`: Meta
- `F8`: Meta
- `F9`: Meta
- `F10`: Meta
- `U10`: 6
- `S15`: Cenários dos anos e médias (info. GPT)
- `A16`: 2027
- `B16`: Semana

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `B1` | `='[1]Cronograma de ativ.'!B63` | ✓ |
| `C1` | `=_xlfn.DAYS(B2,B1)` |  |
| `I2` | `=(($B$14+$D$14)*H2)` |  |
| `I3` | `=((B13+D13)*H3)` |  |
| `I4` | `=((B26+D26)*H4)` |  |
| `I5` | `=(B40+D40)*H5` |  |
| `I6` | `=(B40+D40)*H6` |  |
| `B7` | `=U9` |  |
| `D7` | `=U10` |  |
| `I7` | `=(B40+D40)*H7` |  |
| `B8` | `=$B$6*B7` |  |
| `D8` | `=D6*D7` |  |
| `I8` | `=(B40+D40)*H8` |  |
| `B9` | `=K29` |  |
| `D9` | `=K29` |  |

**⚠️ Referências Externas detectadas:**

- `B1`: refs `['[1]']`

#### Aba: `Ocupação e unit economics 2.0`

- Fórmulas: **227**
- Inputs numéricos: **59**
- Labels/Cabeçalhos: **51**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Custos fixos mensais 
- `J1`: Custos variáveis mensais 
- `B2`: Ano 1
- `C2`: Ano 2
- `D2`: Ano 3
- `E2`: Ano 4
- `F2`: Ano 5
- `G2`: Ano 6/7
- `H2`: Ano 8
- `K2`: Ano 1
- `L2`: Anos 2-7
- `J5`: % total variável
- `A19`: Total custos fixos/mês
- `A21`: Capacidade academia
- `A38`: Ocupação por ano
- `A47`: Preços dos planos
- `A54`: Mix de vendas
- `A62`: Preço médio/aula
- `A66`: Unit economics ao ano
- `B66`: Ano 1

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `B3` | `=Financiamento!B2` |  |
| `C3` | `=B3*1.1` |  |
| `D3` | `=C3*1.1` |  |
| `E3` | `=D3*1.1` |  |
| `F3` | `=E3*1.1` |  |
| `G3` | `=F3*1.1` |  |
| `H3` | `=G3*1.1` |  |
| `B4` | `=Equipe!J6` |  |
| `C4` | `=B4*1.1` |  |
| `D4` | `=C4*1.1` |  |
| `E4` | `=D4*1.1` |  |
| `F4` | `=E4*1.1` |  |
| `G4` | `=F4*1.1` |  |
| `H4` | `=G4*1.1` |  |
| `B5` | `=Equipe!D10` |  |

#### Aba: `Cálculo kit higiene`

- Fórmulas: **84**
- Inputs numéricos: **20**
- Labels/Cabeçalhos: **19**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Parâmetros
- `C1`: valores
- `E4`: Horas sábado func.
- `F4`: Horas domingo func.
- `G4`: Horas dias úteis func.
- `H4`: Dias úteis
- `E7`: Média de aulas dadas por dia/professor (dias vazios e cheios)
- `H7`: arredondando
- `A20`: Cálculos
- `A27`: Ano
- `B27`: Ocupação
- `D27`: Banhos profs./mês
- `E27`: Banhos totais/mês
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `H27`: Qtd.Reposições
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C2` | `=H8` |  |
| `C5` | `=H5*G5` |  |
| `C6` | `=E5+F5` |  |
| `C7` | `=C3*C5` |  |
| `C8` | `=C6*C3` |  |
| `E8` | `=('Cálcul. para definição benefic'!D31+'Cálcul. para definição benefic'!C31)/2` |  |
| `H8` | `=ROUNDDOWN(E8,1)` |  |
| `C9` | `=C7+C8` |  |
| `C10` | `=C9/C2` |  |
| `C11` | `=C10*4` |  |
| `C22` | `=C11` |  |
| `C23` | `=C21+C22` |  |
| `C24` | `=C12` |  |
| `C25` | `=C13` |  |
| `B28` | `='Cálcul. trabalhado'!H3` |  |

#### Aba: `Equipe`

- Fórmulas: **199**
- Inputs numéricos: **123**
- Labels/Cabeçalhos: **72**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: 2027
- `B2`: Equipe de 6 horas
- `D2`: Salário
- `E2`: Produtividade
- `F2`: R$ Produtiv.
- `G2`: Encargos + Benefícios
- `H2`: R$ Encargos
- `I2`: R$ Salário + Encargos + Produt.
- `J2`: Total
- `A12`: 2028
- `B12`: Equipe de 6 horas
- `D12`: Salário
- `E12`: Produtividade
- `F12`: R$ Produtiv.
- `G12`: Encargos + Benefícios
- `H12`: R$ Encargos
- `I12`: R$ Salário + Encargos + Produt.
- `J12`: Total
- `A22`: 2029
- `B22`: Equipe de 6 horas

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D3*G3` |  |
| `I3` | `=D3+H3` |  |
| `J3` | `=I3*C3` |  |
| `H4` | `=D4*G4` |  |
| `I4` | `=D4+H4+E4` |  |
| `J4` | `=I4*C4` |  |
| `F5` | `=E5*'Cálcul. trabalhado'!I3` |  |
| `H5` | `=(D5+F5)*G5` |  |
| `I5` | `=D5+H5+F5` |  |
| `J5` | `=I5*C5` |  |
| `H6` | `=D6*G6` |  |
| `I6` | `=D6+H6` |  |
| `J6` | `=I6*C6` |  |
| `H7` | `=D7*G7` |  |
| `I7` | `=D7+H7` |  |

#### Aba: `Orçamento máquinas`

- Fórmulas: **16**
- Inputs numéricos: **104**
- Labels/Cabeçalhos: **20**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: Equipamentos
- `D2`: TechnoGym
- `G2`: Lifefitness
- `J2`: Cimerian
- `M2`: Total Health
- `P2`: Buckler
- `R2`: Matrix
- `T2`: Fokus
- `A20`: Pesos livres
- `D20`: Poundfit
- `G20`: HubGym
- `J20`: Rotha
- `M20`: BRW Group
- `O20`: Bucker
- `A28`: Acessórios
- `D28`: Estimativa (aprox)
- `G28`: BRW Group
- `T36`: Valor total mínimo ~
- `T38`: Tech+Life+Matrix
- `T40`: total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D16` | `=D3+D4+D5+D6+D7+D9+D10+D11+D12` |  |
| `G16` | `=G3+G5+G6+G7+G9+G10+G11+G12+G4+G13+G14+G15` |  |
| `J16` | `=J3+J4+J5+J6+J7+J9+J10+J11+J12` |  |
| `M16` | `=M3+M4+M5+M6+M7+M9+M11+M12` |  |
| `P16` | `=P3+P4+P5+P6+P7+P9+P10+P11+P12+P14+T4+P15` |  |
| `R16` | `=R13+R14+R15` |  |
| `D26` | `=D21+D22+D23+D24` |  |
| `G26` | `=G21+G22+G23+G24` |  |
| `J26` | `=J21+J22+J23+J24+J25` |  |
| `M26` | `=M21+M22+M23+M24` |  |
| `O26` | `=O21+O22+O23+O24+O25` |  |
| `W36` | `=J16+J26+D46` |  |
| `W38` | `=G3+G4+G5+G6+G7+G9+T8+D11+D12+R13+R14+R15` |  |
| `W40` | `=W38+D46` |  |
| `D46` | `=D29+D30+D31+D32+D33+D34+D35+D36+D37+D38+D39+D40+D41+D42+D43+D44+D45` |  |

#### Aba: `Cronog. de Ativ. `

- Fórmulas: **104**
- Inputs numéricos: **32**
- Labels/Cabeçalhos: **39**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `B1`: Inicio
- `C1`: Prazo (dias)
- `D1`: Término
- `E1`: Offset
- `A2`: Fase S (sistema)
- `B13`: Início
- `C13`: Prazo (dias)
- `D13`: Término
- `E13`: Offset
- `A14`: Fase I (Imóvel)
- `B21`: Início
- `C21`: Prazo (dias)
- `D21`: Término
- `E21`: Offset
- `A22`: Fase II (Contábil e legal)
- `C22`: 10
- `B29`: Início
- `C29`: Prazo (dias)
- `D29`: Término
- `E29`: Offset

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=D10` |  |
| `D3` | `=B3+C3` |  |
| `E3` | `=B3-DATE(2025,10,1)` |  |
| `D4` | `=B4+C4` |  |
| `E4` | `=B4-DATE(2025,10,1)` |  |
| `B5` | `=D4` |  |
| `D5` | `=B5+C5` |  |
| `E5` | `=B5-DATE(2025,10,1)` |  |
| `B6` | `=D5` |  |
| `D6` | `=B6+C6` |  |
| `E6` | `=B6-DATE(2025,10,1)` |  |
| `B7` | `=D6` |  |
| `D7` | `=B7+C7` |  |
| `E7` | `=B7-DATE(2025,10,1)` |  |
| `B8` | `=D7` |  |

#### Aba: `Cálcul. para definição benefic`

- Fórmulas: **0**
- Inputs numéricos: **27**
- Labels/Cabeçalhos: **30**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A28`: Estastística descritiva
- `F28`: Interpretção dos dados
- `P28`: Critérios para definição da faixa ideal de aulas/mês por plano
- `A29`: indicador
- `B29`: aulas/mês
- `C29`: Dia cheio
- `D29`: Dia vazio
- `F29`: Distribuição mensal é muito dispersa
- `A30`: amostra n
- `A31`: média
- `F31`: Média mensal de aulas dadas
- `A32`: mediana
- `A33`: moda
- `F33`: média mensal de aulas dadas (com IC 95%)
- `A34`: desvio s
- `A35`: mínimo
- `A36`: máximo
- `F36`: Dia cheio e dia vazio típicos
- `A37`: Q1 (25%)
- `A38`: Q3 (75%)

#### Aba: `Fórmulas fee para split`

- Fórmulas: **4**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **2**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Variáveis do sistema
- `B1`: Definições

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C3` | `=IF(C4>=110,50,IF(C4>=71,55,IF(C4>=41,60,IF(C4>=15,65,0))))` |  |
| `C5` | `=C6*(C2+C3)` |  |
| `C7` | `=C6*C3` |  |
| `C8` | `=C5-C7` |  |

#### Aba: `Benefícios Personal`

- Fórmulas: **16**
- Inputs numéricos: **24**
- Labels/Cabeçalhos: **27**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `B1`: Diamante
- `C1`: Ouro
- `D1`: Prata 
- `E1`: Bronze
- `A2`: Meta aulas dadas/mês
- `A3`: R$ Hora
- `H3`: Planos e faturamento mensal 
- `A4`: Internet
- `A5`: Bebodouro Água
- `H5`: Bronze
- `A6`: Banheiro
- `H6`: Prata
- `A7`: Banho
- `H7`: Ouro
- `A8`: Acesso Facial 
- `H8`: Diamante
- `A9`: Autonomia de imagem (sem uniformes obrigat.)
- `A11`: Hora para Treino Pessoal
- `A12`: Sala para Refeição

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `K5` | `=I5*J5` |  |
| `M5` | `=K5*L5` |  |
| `O5` | `=M5*N5` |  |
| `Q5` | `=P5*O5` |  |
| `K6` | `=I6*J6` |  |
| `M6` | `=K6*L6` |  |
| `O6` | `=M6*N6` |  |
| `Q6` | `=O6*P6` |  |
| `K7` | `=I7*J7` |  |
| `M7` | `=K7*L7` |  |
| `O7` | `=M7*N7` |  |
| `Q7` | `=O7*P7` |  |
| `K8` | `=I8*J8` |  |
| `M8` | `=K8*L8` |  |
| `O8` | `=M8*N8` |  |

#### Aba: `Benefícios aluno`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **4**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `A2`: Academia exclusiva
- `A4`: Sala de espera
- `A6`: Zero mensalidade

#### Aba: `Manifesto`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **0**
- Referências externas: **0**

#### Aba: `Concorrentes`

- Fórmulas: **12**
- Inputs numéricos: **33**
- Labels/Cabeçalhos: **22**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D2`: Academia Leven
- `I3`: R$ Pers.
- `A10`: Comparativo academias
- `A11`: Academia
- `D11`: Taxa p/ professor
- `F11`: Uniforme (cal/cam)
- `H11`: ~ mensalidade p/ aluno
- `K11`: Benefícios para o professor
- `A12`: Bodytech (Eldorado/Leopoldo)
- `A13`: Bodytech (Iguatemi)
- `A14`: Bodytech (JK)
- `A15`: Skyfit
- `A16`: Nation CT
- `A17`: Smartfit
- `A18`: Bio ritmo
- `A19`: Six Sport Life
- `A20`: Sett
- `A21`: Nossa academia
- `D21`: R$ 40 - R$ 60/aula
- `F21`: 0

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F4` | `=D4/E4` |  |
| `J4` | `=G4*I4` |  |
| `M4` | `=H4-L4` |  |
| `N4` | `=M4*G4` |  |
| `F5` | `=D5/E5` |  |
| `J5` | `=G5*I5` |  |
| `M5` | `=H5-L5` |  |
| `N5` | `=M5*G5` |  |
| `F6` | `=D6/E6` |  |
| `J6` | `=G6*I6` |  |
| `M6` | `=H6-L6` |  |
| `N6` | `=M6*G6` |  |

#### Aba: `Local`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **2**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Ambientes da academia (250m²)
- `A11`: Possíveis localizações 

---

### `Orçamento 16.0 - Segunda unidade (Alav.).xlsx`

**Abas (17):** `Orçamento`, `Custo investimento `, `Financiamento`, `Água e luz`, `Cálcul. trabalhado`, `Cálculo kit higiene`, `Equipe`, `Orçamento máquinas`, `Cronograma de ativ.`, `Cálcul. para definição benefic`, `Fórmulas fee para split`, `Benefícios Personal`, `Benefícios aluno`, `Manifesto`, `Concorrentes`, `Local`, `Sistema`

#### Aba: `Orçamento`

- Fórmulas: **4329**
- Inputs numéricos: **2123**
- Labels/Cabeçalhos: **223**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Item
- `B1`: Receita
- `C1`: 2028-01-01 00:00:00
- `D1`: 2028-02-01 00:00:00
- `E1`: 2028-03-01 00:00:00
- `F1`: 2028-04-01 00:00:00
- `G1`: 2028-05-01 00:00:00
- `H1`: 2028-06-01 00:00:00
- `I1`: 2028-07-01 00:00:00
- `J1`: 2028-08-01 00:00:00
- `K1`: 2028-09-01 00:00:00
- `L1`: 2028-10-01 00:00:00
- `M1`: 2028-11-01 00:00:00
- `N1`: 2028-12-01 00:00:00
- `T1`: Total Acumulado Ano 1
- `U1`: 2029-01-01 00:00:00
- `V1`: 2029-02-01 00:00:00
- `W1`: 2029-03-01 00:00:00
- `X1`: 2029-04-01 00:00:00
- `Y1`: 2029-05-01 00:00:00

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F2` | `=('Cálcul. trabalhado'!I3)/2` |  |
| `G2` | `=F2*2` |  |
| `H2` | `='Cálcul. trabalhado'!I3` |  |
| `I2` | `=H2` |  |
| `J2` | `=I2` |  |
| `K2` | `=J2` |  |
| `L2` | `=K2` |  |
| `M2` | `=L2` |  |
| `N2` | `=M2` |  |
| `T2` | `=SUM(F2:S2)` |  |
| `U2` | `='Cálcul. trabalhado'!I4` |  |
| `V2` | `=U2` |  |
| `W2` | `=V2` |  |
| `X2` | `=W2` |  |
| `Y2` | `=X2` |  |

#### Aba: `Custo investimento `

- Fórmulas: **20**
- Inputs numéricos: **7**
- Labels/Cabeçalhos: **9**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Investimento - Unidade 2
- `A7`: Total
- `B9`: Origem do custo financeiro
- `B26`: Prazo médio de pagamentos (6 anos)
- `C26`: Meses
- `B27`: Custo financeiro mensal (simulado)
- `B28`: Custo financeiro total do período
- `B30`: Resultado líquido projetado da unidade
- `B31`: Resultado após custo do capital

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=Financiamento!C7+Financiamento!C8` |  |
| `D3` | `=Financiamento!C10` |  |
| `J3` | `=J2*J4` |  |
| `J4` | `=AVERAGE(Orçamento!C10:N10)` |  |
| `D6` | `=J3+J9` |  |
| `D7` | `=SUM(D2:E6)` |  |
| `J9` | `=-(J8*J10)` |  |
| `J10` | `=AVERAGE(Orçamento!F5:N5)` |  |
| `D11` | `=D2` |  |
| `D14` | `=D3+D4+D5` |  |
| `D17` | `=D6` |  |
| `D18` | `=2.2%` |  |
| `D20` | `=D11/$D$7` |  |
| `D21` | `=D14/$D$7` |  |
| `D22` | `=D17/$D$7` |  |

#### Aba: `Financiamento`

- Fórmulas: **45**
- Inputs numéricos: **28**
- Labels/Cabeçalhos: **7**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D22`: Máquinas
- `E22`: Pesos livres
- `F22`: Imóvel
- `G22`: Arquit. 
- `H22`: Branding
- `B29`: R$ Parcela
- `B30`: Total Parcelamento

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `E2` | `=C2*D2` |  |
| `F2` | `=F29` |  |
| `G2` | `=E2*30%` |  |
| `H2` | `=E2-G2` |  |
| `E3` | `=D3*C2` |  |
| `B5` | `=SUM(B6:B9)` |  |
| `D6` | `=C6*B6` |  |
| `F6` | `=E6*D6` |  |
| `G6` | `=D6-F6` |  |
| `C7` | `='Orçamento máquinas'!W40` |  |
| `D7` | `=C7*B7` |  |
| `F7` | `=E7*D7` |  |
| `G7` | `=D7-F7` |  |
| `H7` | `=D29` |  |
| `D8` | `=C8*B8` |  |

#### Aba: `Água e luz`

- Fórmulas: **75**
- Inputs numéricos: **21**
- Labels/Cabeçalhos: **18**
- Referências externas: **12**

**Principais labels/cabeçalhos detectados:**

- `A1`: Energia
- `B1`: Valor
- `F1`: Síntese
- `F2`: Ano
- `G2`: Ocupação
- `H2`: Energia
- `I2`: Água
- `J2`: Total
- `A6`: Ocupação
- `B6`: Parcela fixa
- `C6`: Parcela variável
- `D6`: Energia total
- `A14`: Água
- `B14`: Valor
- `A18`: Ocupação
- `B18`: Parcela fixa
- `C18`: Parcela variável
- `D18`: Água total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D7` |  |
| `I3` | `=D19` |  |
| `J3` | `=H3+I3` |  |
| `H4` | `=D8` |  |
| `I4` | `=D20` |  |
| `J4` | `=H4+I4` |  |
| `H5` | `=D9` |  |
| `I5` | `=D21` |  |
| `J5` | `=H5+I5` |  |
| `H6` | `=D10` |  |
| `I6` | `=D22` |  |
| `J6` | `=H6+I6` |  |
| `A7` | `='[1]Cálcul. trabalhado'!H4` | ✓ |
| `B7` | `=B2` |  |
| `C7` | `=B3*A7` |  |

**⚠️ Referências Externas detectadas:**

- `A7`: refs `['[1]']`
- `A8`: refs `['[1]']`
- `A9`: refs `['[1]']`
- `A10`: refs `['[1]']`
- `A11`: refs `['[1]']`
- `A12`: refs `['[1]']`
- `A19`: refs `['[1]']`
- `A20`: refs `['[1]']`
- `A21`: refs `['[1]']`
- `A22`: refs `['[1]']`

#### Aba: `Cálcul. trabalhado`

- Fórmulas: **71**
- Inputs numéricos: **74**
- Labels/Cabeçalhos: **39**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `F1`: Aluno por Hora
- `G1`: 10
- `H1`: Tx de Ocupação (% Hs)
- `I1`: Res. Mensal
- `F2`: Meta
- `A3`: 2026
- `B3`: Semana
- `D3`: Sábado
- `F3`: Meta
- `F4`: Meta
- `F5`: Meta
- `F6`: Meta
- `F7`: Meta
- `F8`: Meta
- `F9`: Meta
- `U10`: 6
- `S15`: Cenários dos anos e médias (info. GPT)
- `A16`: 2027
- `B16`: Semana
- `D16`: Sábado

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C1` | `=_xlfn.DAYS(B2,B1)` |  |
| `I2` | `=(($B$14+$D$14)*H2)` |  |
| `I3` | `=((B13+D13)*H3)` |  |
| `I4` | `=((B26+D26)*H4)` |  |
| `I5` | `=(B40+D40)*H5` |  |
| `I6` | `=(B40+D40)*H6` |  |
| `B7` | `=U9` |  |
| `D7` | `=U10` |  |
| `I7` | `=(B40+D40)*H7` |  |
| `B8` | `=$B$6*B7` |  |
| `D8` | `=D6*D7` |  |
| `I8` | `=(B40+D40)*H8` |  |
| `B9` | `=K20` |  |
| `D9` | `=K20` |  |
| `I9` | `=(B40+D40)*H9` |  |

#### Aba: `Cálculo kit higiene`

- Fórmulas: **76**
- Inputs numéricos: **18**
- Labels/Cabeçalhos: **19**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Parâmetros
- `C1`: valores
- `E4`: Horas sábado func.
- `F4`: Horas domingo func.
- `G4`: Horas dias úteis func.
- `H4`: Dias úteis
- `E7`: Média de aulas dadas por dia/professor (dias vazios e cheios)
- `H7`: arredondando
- `A20`: Cálculos
- `A27`: Ano
- `B27`: Ocupação
- `D27`: Banhos profs./mês
- `E27`: Banhos totais/mês
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `H27`: Qtd.Reposições
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C2` | `=H8` |  |
| `C5` | `=H5*G5` |  |
| `C6` | `=E5+F5` |  |
| `C7` | `=C3*C5` |  |
| `C8` | `=C6*C3` |  |
| `E8` | `=('Cálcul. para definição benefic'!D31+'Cálcul. para definição benefic'!C31)/2` |  |
| `H8` | `=ROUNDDOWN(E8,1)` |  |
| `C9` | `=C7+C8` |  |
| `C10` | `=C9/C2` |  |
| `C11` | `=C10*4` |  |
| `C22` | `=C11` |  |
| `C23` | `=C21+C22` |  |
| `C24` | `=C12` |  |
| `C25` | `=C13` |  |
| `B28` | `='Cálcul. trabalhado'!H3` |  |

#### Aba: `Equipe`

- Fórmulas: **145**
- Inputs numéricos: **87**
- Labels/Cabeçalhos: **54**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: 2028
- `B2`: Equipe de 6 horas
- `D2`: Salário
- `E2`: Produtividade
- `F2`: R$ Produtiv.
- `G2`: Encargos + Benefícios
- `H2`: R$ Encargos
- `I2`: R$ Salário + Encargos + Produt.
- `J2`: Total
- `A12`: 2029
- `B12`: Equipe de 6 horas
- `D12`: Salário
- `E12`: Produtividade
- `F12`: R$ Produtiv.
- `G12`: Encargos + Benefícios
- `H12`: R$ Encargos
- `I12`: R$ Salário + Encargos + Produt.
- `J12`: Total
- `A22`: 2030
- `B22`: Equipe de 6 horas

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D3*G3` |  |
| `I3` | `=D3+H3` |  |
| `J3` | `=I3*C3` |  |
| `H4` | `=D4*G4` |  |
| `I4` | `=D4+H4+E4` |  |
| `J4` | `=I4*C4` |  |
| `F5` | `=E5*'Cálcul. trabalhado'!I3` |  |
| `H5` | `=(D5+F5)*G5` |  |
| `I5` | `=D5+H5+F5` |  |
| `J5` | `=I5*C5` |  |
| `H6` | `=D6*G6` |  |
| `I6` | `=D6+H6` |  |
| `J6` | `=I6*C6` |  |
| `H7` | `=D7*G7` |  |
| `I7` | `=D7+H7` |  |

#### Aba: `Orçamento máquinas`

- Fórmulas: **16**
- Inputs numéricos: **104**
- Labels/Cabeçalhos: **20**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: Equipamentos
- `D2`: TechnoGym
- `G2`: Lifefitness
- `J2`: Cimerian
- `M2`: Total Health
- `P2`: Buckler
- `R2`: Matrix
- `T2`: Fokus
- `A20`: Pesos livres
- `D20`: Poundfit
- `G20`: HubGym
- `J20`: Rotha
- `M20`: BRW Group
- `O20`: Bucker
- `A28`: Acessórios
- `D28`: Estimativa (aprox)
- `G28`: BRW Group
- `T36`: Valor total mínimo ~
- `T38`: Tech+Life+Matrix
- `T40`: total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D16` | `=D3+D4+D5+D6+D7+D9+D10+D11+D12` |  |
| `G16` | `=G3+G5+G6+G7+G9+G10+G11+G12+G4+G13+G14+G15` |  |
| `J16` | `=J3+J4+J5+J6+J7+J9+J10+J11+J12` |  |
| `M16` | `=M3+M4+M5+M6+M7+M9+M11+M12` |  |
| `P16` | `=P3+P4+P5+P6+P7+P9+P10+P11+P12+P14+T4+P15` |  |
| `R16` | `=R13+R14+R15` |  |
| `D26` | `=D21+D22+D23+D24` |  |
| `G26` | `=G21+G22+G23+G24` |  |
| `J26` | `=J21+J22+J23+J24+J25` |  |
| `M26` | `=M21+M22+M23+M24` |  |
| `O26` | `=O21+O22+O23+O24+O25` |  |
| `W36` | `=J16+J26+D46` |  |
| `W38` | `=G3+G4+G5+G6+G7+G9+T8+D11+D12+R13+R14+R15` |  |
| `W40` | `=W38+D46` |  |
| `D46` | `=D29+D30+D31+D32+D33+D34+D35+D36+D37+D38+D39+D40+D41+D42+D43+D44+D45` |  |

#### Aba: `Cronograma de ativ.`

- Fórmulas: **104**
- Inputs numéricos: **32**
- Labels/Cabeçalhos: **39**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `B1`: Inicio
- `C1`: Prazo (dias)
- `D1`: Término
- `E1`: Offset
- `A2`: Fase S (sistema)
- `B13`: Início
- `C13`: Prazo (dias)
- `D13`: Término
- `E13`: Offset
- `A14`: Fase I (Imóvel)
- `B21`: Início
- `C21`: Prazo (dias)
- `D21`: Término
- `E21`: Offset
- `A22`: Fase II (Contábil e legal)
- `C22`: 10
- `B29`: Início
- `C29`: Prazo (dias)
- `D29`: Término
- `E29`: Offset

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=D10` |  |
| `D3` | `=B3+C3` |  |
| `E3` | `=B3-DATE(2025,10,1)` |  |
| `D4` | `=B4+C4` |  |
| `E4` | `=B4-DATE(2025,10,1)` |  |
| `B5` | `=D4` |  |
| `D5` | `=B5+C5` |  |
| `E5` | `=B5-DATE(2025,10,1)` |  |
| `B6` | `=D5` |  |
| `D6` | `=B6+C6` |  |
| `E6` | `=B6-DATE(2025,10,1)` |  |
| `B7` | `=D6` |  |
| `D7` | `=B7+C7` |  |
| `E7` | `=B7-DATE(2025,10,1)` |  |
| `B8` | `=D7` |  |

#### Aba: `Cálcul. para definição benefic`

- Fórmulas: **0**
- Inputs numéricos: **27**
- Labels/Cabeçalhos: **30**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A28`: Estastística descritiva
- `F28`: Interpretção dos dados
- `P28`: Critérios para definição da faixa ideal de aulas/mês por plano
- `A29`: indicador
- `B29`: aulas/mês
- `C29`: Dia cheio
- `D29`: Dia vazio
- `F29`: Distribuição mensal é muito dispersa
- `A30`: amostra n
- `A31`: média
- `F31`: Média mensal de aulas dadas
- `A32`: mediana
- `A33`: moda
- `F33`: média mensal de aulas dadas (com IC 95%)
- `A34`: desvio s
- `A35`: mínimo
- `A36`: máximo
- `F36`: Dia cheio e dia vazio típicos
- `A37`: Q1 (25%)
- `A38`: Q3 (75%)

#### Aba: `Fórmulas fee para split`

- Fórmulas: **4**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **2**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Variáveis do sistema
- `B1`: Definições

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C3` | `=IF(C4>=110,50,IF(C4>=71,55,IF(C4>=41,60,IF(C4>=15,65,0))))` |  |
| `C5` | `=C6*(C2+C3)` |  |
| `C7` | `=C6*C3` |  |
| `C8` | `=C5-C7` |  |

#### Aba: `Benefícios Personal`

- Fórmulas: **16**
- Inputs numéricos: **24**
- Labels/Cabeçalhos: **27**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `B1`: Diamante
- `C1`: Ouro
- `D1`: Prata 
- `E1`: Bronze
- `A2`: Meta aulas dadas/mês
- `A3`: R$ Hora
- `H3`: Planos e faturamento mensal 
- `A4`: Internet
- `A5`: Bebodouro Água
- `H5`: Bronze
- `A6`: Banheiro
- `H6`: Prata
- `A7`: Banho
- `H7`: Ouro
- `A8`: Acesso Facial 
- `H8`: Diamante
- `A9`: Autonomia de imagem (sem uniformes obrigat.)
- `A11`: Hora para Treino Pessoal
- `A12`: Sala para Refeição

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `K5` | `=I5*J5` |  |
| `M5` | `=K5*L5` |  |
| `O5` | `=M5*N5` |  |
| `Q5` | `=P5*O5` |  |
| `K6` | `=I6*J6` |  |
| `M6` | `=K6*L6` |  |
| `O6` | `=M6*N6` |  |
| `Q6` | `=O6*P6` |  |
| `K7` | `=I7*J7` |  |
| `M7` | `=K7*L7` |  |
| `O7` | `=M7*N7` |  |
| `Q7` | `=O7*P7` |  |
| `K8` | `=I8*J8` |  |
| `M8` | `=K8*L8` |  |
| `O8` | `=M8*N8` |  |

#### Aba: `Benefícios aluno`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **4**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `A2`: Academia exclusiva
- `A4`: Sala de espera
- `A6`: Zero mensalidade

#### Aba: `Manifesto`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **0**
- Referências externas: **0**

#### Aba: `Concorrentes`

- Fórmulas: **12**
- Inputs numéricos: **33**
- Labels/Cabeçalhos: **22**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D2`: Academia Leven
- `I3`: R$ Pers.
- `A10`: Comparativo academias
- `A11`: Academia
- `D11`: Taxa p/ professor
- `F11`: Uniforme (cal/cam)
- `H11`: ~ mensalidade p/ aluno
- `K11`: Benefícios para o professor
- `A12`: Bodytech (Eldorado/Leopoldo)
- `A13`: Bodytech (Iguatemi)
- `A14`: Bodytech (JK)
- `A15`: Skyfit
- `A16`: Nation CT
- `A17`: Smartfit
- `A18`: Bio ritmo
- `A19`: Six Sport Life
- `A20`: Sett
- `A21`: Nossa academia
- `D21`: R$ 40 - R$ 60/aula
- `F21`: 0

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F4` | `=D4/E4` |  |
| `J4` | `=G4*I4` |  |
| `M4` | `=H4-L4` |  |
| `N4` | `=M4*G4` |  |
| `F5` | `=D5/E5` |  |
| `J5` | `=G5*I5` |  |
| `M5` | `=H5-L5` |  |
| `N5` | `=M5*G5` |  |
| `F6` | `=D6/E6` |  |
| `J6` | `=G6*I6` |  |
| `M6` | `=H6-L6` |  |
| `N6` | `=M6*G6` |  |

#### Aba: `Local`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **2**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Ambientes da academia (250m²)
- `A11`: Possíveis localizações 

#### Aba: `Sistema`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **0**
- Referências externas: **0**

---

### `Orçamento 16.0 - Terceira unidade (Alav.).xlsx`

**Abas (16):** `Orçamento`, `Custo investimento `, `Financiamento`, `Água e luz`, `Cálcul. trabalhado`, `Cálculo kit higiene`, `Equipe`, `Orçamento máquinas`, `Cronograma de ativ.`, `Cálcul. para definição benefic`, `Benefícios Personal`, `Benefícios aluno`, `Manifesto`, `Concorrentes`, `Local`, `Sistema`

#### Aba: `Orçamento`

- Fórmulas: **3868**
- Inputs numéricos: **1976**
- Labels/Cabeçalhos: **208**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Item
- `B1`: Receita
- `C1`: 2028-08-01 00:00:00
- `D1`: 2028-09-01 00:00:00
- `E1`: 2028-10-01 00:00:00
- `F1`: 2028-11-01 00:00:00
- `G1`: 2028-12-01 00:00:00
- `H1`: 2029-01-01 00:00:00
- `I1`: 2029-02-01 00:00:00
- `J1`: 2029-03-01 00:00:00
- `K1`: 2029-04-01 00:00:00
- `L1`: 2029-05-01 00:00:00
- `M1`: 2029-06-01 00:00:00
- `N1`: 2029-07-01 00:00:00
- `O1`: 2029-08-01 00:00:00
- `P1`: 2029-09-01 00:00:00
- `Q1`: 2029-10-01 00:00:00
- `R1`: 2029-11-01 00:00:00
- `S1`: 2029-12-01 00:00:00
- `T1`: Total Acumulado Ano 1

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F2` | `=('Cálcul. trabalhado'!I3)/2` |  |
| `G2` | `=F2*2` |  |
| `H2` | `='Cálcul. trabalhado'!I4` |  |
| `I2` | `=H2` |  |
| `J2` | `=I2` |  |
| `K2` | `=J2` |  |
| `L2` | `=K2` |  |
| `M2` | `=L2` |  |
| `N2` | `=M2` |  |
| `O2` | `=N2` |  |
| `P2` | `=O2` |  |
| `Q2` | `=P2` |  |
| `R2` | `=Q2` |  |
| `S2` | `=R2` |  |
| `T2` | `=SUM(F2:S2)` |  |

#### Aba: `Custo investimento `

- Fórmulas: **20**
- Inputs numéricos: **7**
- Labels/Cabeçalhos: **9**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Investimento - Unidade 3
- `A7`: Total
- `B9`: Origem do custo financeiro
- `B26`: Prazo médio de pagamentos (6 anos)
- `C26`: Meses
- `B27`: Custo financeiro mensal (simulado)
- `B28`: Custo financeiro total do período
- `B30`: Resultado líquido projetado da unidade
- `B31`: Resultado após custo do capital

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=Financiamento!C7+Financiamento!C8` |  |
| `D3` | `=Financiamento!C10` |  |
| `J3` | `=J2*J4` |  |
| `J4` | `=AVERAGE(Orçamento!C10:N10)` |  |
| `D6` | `=J3+J9` |  |
| `D7` | `=SUM(D2:E6)` |  |
| `J9` | `=-(J8*J10)` |  |
| `J10` | `=AVERAGE(Orçamento!F5:N5)` |  |
| `D11` | `=D2` |  |
| `D14` | `=D3+D4+D5` |  |
| `D17` | `=D6` |  |
| `D18` | `=2.2%` |  |
| `D20` | `=D11/$D$7` |  |
| `D21` | `=D14/$D$7` |  |
| `D22` | `=D17/$D$7` |  |

#### Aba: `Financiamento`

- Fórmulas: **45**
- Inputs numéricos: **28**
- Labels/Cabeçalhos: **7**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D22`: Máquinas
- `E22`: Pesos livres
- `F22`: Imóvel
- `G22`: Arquit. 
- `H22`: Branding
- `B29`: R$ Parcela
- `B30`: Total Parcelamento

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `E2` | `=C2*D2` |  |
| `F2` | `=F29` |  |
| `G2` | `=E2*30%` |  |
| `H2` | `=E2-G2` |  |
| `E3` | `=D3*C2` |  |
| `B5` | `=SUM(B6:B9)` |  |
| `D6` | `=C6*B6` |  |
| `F6` | `=E6*D6` |  |
| `G6` | `=D6-F6` |  |
| `C7` | `='Orçamento máquinas'!W40` |  |
| `D7` | `=C7*B7` |  |
| `F7` | `=E7*D7` |  |
| `G7` | `=D7-F7` |  |
| `H7` | `=D29` |  |
| `D8` | `=C8*B8` |  |

#### Aba: `Água e luz`

- Fórmulas: **66**
- Inputs numéricos: **17**
- Labels/Cabeçalhos: **18**
- Referências externas: **12**

**Principais labels/cabeçalhos detectados:**

- `A1`: Energia
- `B1`: Valor
- `F1`: Síntese
- `F2`: Ano
- `G2`: Ocupação
- `H2`: Energia
- `I2`: Água
- `J2`: Total
- `A6`: Ocupação
- `B6`: Parcela fixa
- `C6`: Parcela variável
- `D6`: Energia total
- `A14`: Água
- `B14`: Valor
- `A18`: Ocupação
- `B18`: Parcela fixa
- `C18`: Parcela variável
- `D18`: Água total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D7` |  |
| `I3` | `=D19` |  |
| `J3` | `=H3+I3` |  |
| `H4` | `=D8` |  |
| `I4` | `=D20` |  |
| `J4` | `=H4+I4` |  |
| `H5` | `=D9` |  |
| `I5` | `=D21` |  |
| `J5` | `=H5+I5` |  |
| `H6` | `=D10` |  |
| `I6` | `=D22` |  |
| `J6` | `=H6+I6` |  |
| `A7` | `='[1]Cálcul. trabalhado'!H4` | ✓ |
| `B7` | `=B2` |  |
| `C7` | `=B3*A7` |  |

**⚠️ Referências Externas detectadas:**

- `A7`: refs `['[1]']`
- `A8`: refs `['[1]']`
- `A9`: refs `['[1]']`
- `A10`: refs `['[1]']`
- `A11`: refs `['[1]']`
- `A12`: refs `['[1]']`
- `A19`: refs `['[1]']`
- `A20`: refs `['[1]']`
- `A21`: refs `['[1]']`
- `A22`: refs `['[1]']`

#### Aba: `Cálcul. trabalhado`

- Fórmulas: **71**
- Inputs numéricos: **74**
- Labels/Cabeçalhos: **39**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `F1`: Aluno por Hora
- `G1`: 10
- `H1`: Tx de Ocupação (% Hs)
- `I1`: Res. Mensal
- `F2`: Meta
- `A3`: 2026
- `B3`: Semana
- `D3`: Sábado
- `F3`: Meta
- `F4`: Meta
- `F5`: Meta
- `F6`: Meta
- `F7`: Meta
- `F8`: Meta
- `F9`: Meta
- `U10`: 6
- `S15`: Cenários dos anos e médias (info. GPT)
- `A16`: 2027
- `B16`: Semana
- `D16`: Sábado

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C1` | `=_xlfn.DAYS(B2,B1)` |  |
| `I2` | `=(($B$14+$D$14)*H2)` |  |
| `I3` | `=((B13+D13)*H3)` |  |
| `I4` | `=((B26+D26)*H4)` |  |
| `I5` | `=(B40+D40)*H5` |  |
| `I6` | `=(B40+D40)*H6` |  |
| `B7` | `=U9` |  |
| `D7` | `=U10` |  |
| `I7` | `=(B40+D40)*H7` |  |
| `B8` | `=$B$6*B7` |  |
| `D8` | `=D6*D7` |  |
| `I8` | `=(B40+D40)*H8` |  |
| `B9` | `=K20` |  |
| `D9` | `=K20` |  |
| `I9` | `=(B40+D40)*H9` |  |

#### Aba: `Cálculo kit higiene`

- Fórmulas: **76**
- Inputs numéricos: **18**
- Labels/Cabeçalhos: **19**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Parâmetros
- `C1`: valores
- `E4`: Horas sábado func.
- `F4`: Horas domingo func.
- `G4`: Horas dias úteis func.
- `H4`: Dias úteis
- `E7`: Média de aulas dadas por dia/professor (dias vazios e cheios)
- `H7`: arredondando
- `A20`: Cálculos
- `A27`: Ano
- `B27`: Ocupação
- `D27`: Banhos profs./mês
- `E27`: Banhos totais/mês
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `H27`: Qtd.Reposições
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C2` | `=H8` |  |
| `C5` | `=H5*G5` |  |
| `C6` | `=E5+F5` |  |
| `C7` | `=C3*C5` |  |
| `C8` | `=C6*C3` |  |
| `E8` | `=('Cálcul. para definição benefic'!D31+'Cálcul. para definição benefic'!C31)/2` |  |
| `H8` | `=ROUNDDOWN(E8,1)` |  |
| `C9` | `=C7+C8` |  |
| `C10` | `=C9/C2` |  |
| `C11` | `=C10*4` |  |
| `C22` | `=C11` |  |
| `C23` | `=C21+C22` |  |
| `C24` | `=C12` |  |
| `C25` | `=C13` |  |
| `B28` | `='Cálcul. trabalhado'!H3` |  |

#### Aba: `Equipe`

- Fórmulas: **145**
- Inputs numéricos: **87**
- Labels/Cabeçalhos: **54**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: 2031
- `B2`: Equipe de 6 horas
- `D2`: Salário
- `E2`: Produtividade
- `F2`: R$ Produtiv.
- `G2`: Encargos + Benefícios
- `H2`: R$ Encargos
- `I2`: R$ Salário + Encargos + Produt.
- `J2`: Total
- `A12`: 2032
- `B12`: Equipe de 6 horas
- `D12`: Salário
- `E12`: Produtividade
- `F12`: R$ Produtiv.
- `G12`: Encargos + Benefícios
- `H12`: R$ Encargos
- `I12`: R$ Salário + Encargos + Produt.
- `J12`: Total
- `A22`: 2033
- `B22`: Equipe de 6 horas

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D3*G3` |  |
| `I3` | `=D3+H3` |  |
| `J3` | `=I3*C3` |  |
| `H4` | `=D4*G4` |  |
| `I4` | `=D4+H4+E4` |  |
| `J4` | `=I4*C4` |  |
| `F5` | `=E5*'Cálcul. trabalhado'!I3` |  |
| `H5` | `=(D5+F5)*G5` |  |
| `I5` | `=D5+H5+F5` |  |
| `J5` | `=I5*C5` |  |
| `H6` | `=D6*G6` |  |
| `I6` | `=D6+H6` |  |
| `J6` | `=I6*C6` |  |
| `H7` | `=D7*G7` |  |
| `I7` | `=D7+H7` |  |

#### Aba: `Orçamento máquinas`

- Fórmulas: **16**
- Inputs numéricos: **104**
- Labels/Cabeçalhos: **20**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: Equipamentos
- `D2`: TechnoGym
- `G2`: Lifefitness
- `J2`: Cimerian
- `M2`: Total Health
- `P2`: Buckler
- `R2`: Matrix
- `T2`: Fokus
- `A20`: Pesos livres
- `D20`: Poundfit
- `G20`: HubGym
- `J20`: Rotha
- `M20`: BRW Group
- `O20`: Bucker
- `A28`: Acessórios
- `D28`: Estimativa (aprox)
- `G28`: BRW Group
- `T36`: Valor total mínimo ~
- `T38`: Tech+Life+Matrix
- `T40`: total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D16` | `=D3+D4+D5+D6+D7+D9+D10+D11+D12` |  |
| `G16` | `=G3+G5+G6+G7+G9+G10+G11+G12+G4+G13+G14+G15` |  |
| `J16` | `=J3+J4+J5+J6+J7+J9+J10+J11+J12` |  |
| `M16` | `=M3+M4+M5+M6+M7+M9+M11+M12` |  |
| `P16` | `=P3+P4+P5+P6+P7+P9+P10+P11+P12+P14+T4+P15` |  |
| `R16` | `=R13+R14+R15` |  |
| `D26` | `=D21+D22+D23+D24` |  |
| `G26` | `=G21+G22+G23+G24` |  |
| `J26` | `=J21+J22+J23+J24+J25` |  |
| `M26` | `=M21+M22+M23+M24` |  |
| `O26` | `=O21+O22+O23+O24+O25` |  |
| `W36` | `=J16+J26+D46` |  |
| `W38` | `=G3+G4+G5+G6+G7+G9+T8+D11+D12+R13+R14+R15` |  |
| `W40` | `=W38+D46` |  |
| `D46` | `=D29+D30+D31+D32+D33+D34+D35+D36+D37+D38+D39+D40+D41+D42+D43+D44+D45` |  |

#### Aba: `Cronograma de ativ.`

- Fórmulas: **104**
- Inputs numéricos: **32**
- Labels/Cabeçalhos: **39**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `B1`: Inicio
- `C1`: Prazo (dias)
- `D1`: Término
- `E1`: Offset
- `A2`: Fase S (sistema)
- `B13`: Início
- `C13`: Prazo (dias)
- `D13`: Término
- `E13`: Offset
- `A14`: Fase I (Imóvel)
- `B21`: Início
- `C21`: Prazo (dias)
- `D21`: Término
- `E21`: Offset
- `A22`: Fase II (Contábil e legal)
- `C22`: 10
- `B29`: Início
- `C29`: Prazo (dias)
- `D29`: Término
- `E29`: Offset

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=D10` |  |
| `D3` | `=B3+C3` |  |
| `E3` | `=B3-DATE(2025,10,1)` |  |
| `D4` | `=B4+C4` |  |
| `E4` | `=B4-DATE(2025,10,1)` |  |
| `B5` | `=D4` |  |
| `D5` | `=B5+C5` |  |
| `E5` | `=B5-DATE(2025,10,1)` |  |
| `B6` | `=D5` |  |
| `D6` | `=B6+C6` |  |
| `E6` | `=B6-DATE(2025,10,1)` |  |
| `B7` | `=D6` |  |
| `D7` | `=B7+C7` |  |
| `E7` | `=B7-DATE(2025,10,1)` |  |
| `B8` | `=D7` |  |

#### Aba: `Cálcul. para definição benefic`

- Fórmulas: **0**
- Inputs numéricos: **27**
- Labels/Cabeçalhos: **30**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A28`: Estastística descritiva
- `F28`: Interpretção dos dados
- `P28`: Critérios para definição da faixa ideal de aulas/mês por plano
- `A29`: indicador
- `B29`: aulas/mês
- `C29`: Dia cheio
- `D29`: Dia vazio
- `F29`: Distribuição mensal é muito dispersa
- `A30`: amostra n
- `A31`: média
- `F31`: Média mensal de aulas dadas
- `A32`: mediana
- `A33`: moda
- `F33`: média mensal de aulas dadas (com IC 95%)
- `A34`: desvio s
- `A35`: mínimo
- `A36`: máximo
- `F36`: Dia cheio e dia vazio típicos
- `A37`: Q1 (25%)
- `A38`: Q3 (75%)

#### Aba: `Benefícios Personal`

- Fórmulas: **16**
- Inputs numéricos: **24**
- Labels/Cabeçalhos: **27**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `B1`: Diamante
- `C1`: Ouro
- `D1`: Prata 
- `E1`: Bronze
- `A2`: Meta aulas dadas/mês
- `A3`: R$ Hora
- `H3`: Planos e faturamento mensal 
- `A4`: Internet
- `A5`: Bebodouro Água
- `H5`: Bronze
- `A6`: Banheiro
- `H6`: Prata
- `A7`: Banho
- `H7`: Ouro
- `A8`: Acesso Facial 
- `H8`: Diamante
- `A9`: Autonomia de imagem (sem uniformes obrigat.)
- `A11`: Hora para Treino Pessoal
- `A12`: Sala para Refeição

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `K5` | `=I5*J5` |  |
| `M5` | `=K5*L5` |  |
| `O5` | `=M5*N5` |  |
| `Q5` | `=P5*O5` |  |
| `K6` | `=I6*J6` |  |
| `M6` | `=K6*L6` |  |
| `O6` | `=M6*N6` |  |
| `Q6` | `=O6*P6` |  |
| `K7` | `=I7*J7` |  |
| `M7` | `=K7*L7` |  |
| `O7` | `=M7*N7` |  |
| `Q7` | `=O7*P7` |  |
| `K8` | `=I8*J8` |  |
| `M8` | `=K8*L8` |  |
| `O8` | `=M8*N8` |  |

#### Aba: `Benefícios aluno`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **4**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `A2`: Academia exclusiva
- `A4`: Sala de espera
- `A6`: Zero mensalidade

#### Aba: `Manifesto`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **0**
- Referências externas: **0**

#### Aba: `Concorrentes`

- Fórmulas: **12**
- Inputs numéricos: **33**
- Labels/Cabeçalhos: **22**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D2`: Academia Leven
- `I3`: R$ Pers.
- `A10`: Comparativo academias
- `A11`: Academia
- `D11`: Taxa p/ professor
- `F11`: Uniforme (cal/cam)
- `H11`: ~ mensalidade p/ aluno
- `K11`: Benefícios para o professor
- `A12`: Bodytech (Eldorado/Leopoldo)
- `A13`: Bodytech (Iguatemi)
- `A14`: Bodytech (JK)
- `A15`: Skyfit
- `A16`: Nation CT
- `A17`: Smartfit
- `A18`: Bio ritmo
- `A19`: Six Sport Life
- `A20`: Sett
- `A21`: Nossa academia
- `D21`: R$ 40 - R$ 60/aula
- `F21`: 0

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F4` | `=D4/E4` |  |
| `J4` | `=G4*I4` |  |
| `M4` | `=H4-L4` |  |
| `N4` | `=M4*G4` |  |
| `F5` | `=D5/E5` |  |
| `J5` | `=G5*I5` |  |
| `M5` | `=H5-L5` |  |
| `N5` | `=M5*G5` |  |
| `F6` | `=D6/E6` |  |
| `J6` | `=G6*I6` |  |
| `M6` | `=H6-L6` |  |
| `N6` | `=M6*G6` |  |

#### Aba: `Local`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **2**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Ambientes da academia (250m²)
- `A11`: Possíveis localizações 

#### Aba: `Sistema`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **0**
- Referências externas: **0**

---

### `Orçamento 16.0 - Quarta unidade (Alav.).xlsx`

**Abas (17):** `Orçamento`, `Custo investimento `, `Financiamento`, `Água e luz`, `Cálcul. trabalhado`, `Cálculo kit higiene`, `Equipe`, `Orçamento máquinas`, `Cronograma de ativ.`, `Cálcul. para definição benefic`, `Fórmulas fee para split`, `Benefícios Personal`, `Benefícios aluno`, `Manifesto`, `Concorrentes`, `Local`, `Sistema`

#### Aba: `Orçamento`

- Fórmulas: **3678**
- Inputs numéricos: **1826**
- Labels/Cabeçalhos: **198**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Item
- `B1`: Receita
- `C1`: 2029-01-01 00:00:00
- `D1`: 2029-02-01 00:00:00
- `E1`: 2029-03-01 00:00:00
- `F1`: 2029-04-01 00:00:00
- `G1`: 2029-05-01 00:00:00
- `H1`: 2029-06-01 00:00:00
- `I1`: 2029-07-01 00:00:00
- `J1`: 2029-08-01 00:00:00
- `K1`: 2029-09-01 00:00:00
- `L1`: 2029-10-01 00:00:00
- `M1`: 2029-11-01 00:00:00
- `N1`: 2029-12-01 00:00:00
- `T1`: Total Acumulado Ano 1
- `U1`: 2030-01-01 00:00:00
- `V1`: 2030-02-01 00:00:00
- `W1`: 2030-03-01 00:00:00
- `X1`: 2030-04-01 00:00:00
- `Y1`: 2030-05-01 00:00:00

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F2` | `=('Cálcul. trabalhado'!I3)/2` |  |
| `G2` | `=F2*2` |  |
| `H2` | `='Cálcul. trabalhado'!I4` |  |
| `I2` | `=H2` |  |
| `J2` | `=I2` |  |
| `K2` | `=J2` |  |
| `L2` | `=K2` |  |
| `M2` | `=L2` |  |
| `N2` | `=M2` |  |
| `T2` | `=SUM(F2:S2)` |  |
| `U2` | `='Cálcul. trabalhado'!I5` |  |
| `V2` | `=U2` |  |
| `W2` | `=V2` |  |
| `X2` | `=W2` |  |
| `Y2` | `=X2` |  |

#### Aba: `Custo investimento `

- Fórmulas: **20**
- Inputs numéricos: **7**
- Labels/Cabeçalhos: **9**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Investimento - Unidade 4
- `A7`: Total
- `B9`: Origem do custo financeiro
- `B26`: Prazo médio de pagamentos (6 anos)
- `C26`: Meses
- `B27`: Custo financeiro mensal (simulado)
- `B28`: Custo financeiro total do período
- `B30`: Resultado líquido projetado da unidade
- `B31`: Resultado após custo do capital

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=Financiamento!C7+Financiamento!C8` |  |
| `D3` | `=Financiamento!C10` |  |
| `J3` | `=J2*J4` |  |
| `J4` | `=AVERAGE(Orçamento!C10:N10)` |  |
| `D6` | `=J3+J9` |  |
| `D7` | `=SUM(D2:E6)` |  |
| `J9` | `=-(J8*J10)` |  |
| `J10` | `=AVERAGE(Orçamento!F5:N5)` |  |
| `D11` | `=D2` |  |
| `D14` | `=D3+D4+D5` |  |
| `D17` | `=D6` |  |
| `D18` | `=2.2%` |  |
| `D20` | `=D11/$D$7` |  |
| `D21` | `=D14/$D$7` |  |
| `D22` | `=D17/$D$7` |  |

#### Aba: `Financiamento`

- Fórmulas: **45**
- Inputs numéricos: **28**
- Labels/Cabeçalhos: **7**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D22`: Máquinas
- `E22`: Pesos livres
- `F22`: Imóvel
- `G22`: Arquit. 
- `H22`: Branding
- `B29`: R$ Parcela
- `B30`: Total Parcelamento

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `E2` | `=C2*D2` |  |
| `F2` | `=F29` |  |
| `G2` | `=E2*30%` |  |
| `H2` | `=E2-G2` |  |
| `E3` | `=D3*C2` |  |
| `B5` | `=SUM(B6:B9)` |  |
| `D6` | `=C6*B6` |  |
| `F6` | `=E6*D6` |  |
| `G6` | `=D6-F6` |  |
| `C7` | `='Orçamento máquinas'!W40` |  |
| `D7` | `=C7*B7` |  |
| `F7` | `=E7*D7` |  |
| `G7` | `=D7-F7` |  |
| `H7` | `=D29` |  |
| `D8` | `=C8*B8` |  |

#### Aba: `Água e luz`

- Fórmulas: **66**
- Inputs numéricos: **17**
- Labels/Cabeçalhos: **18**
- Referências externas: **12**

**Principais labels/cabeçalhos detectados:**

- `A1`: Energia
- `B1`: Valor
- `F1`: Síntese
- `F2`: Ano
- `G2`: Ocupação
- `H2`: Energia
- `I2`: Água
- `J2`: Total
- `A6`: Ocupação
- `B6`: Parcela fixa
- `C6`: Parcela variável
- `D6`: Energia total
- `A14`: Água
- `B14`: Valor
- `A18`: Ocupação
- `B18`: Parcela fixa
- `C18`: Parcela variável
- `D18`: Água total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D7` |  |
| `I3` | `=D19` |  |
| `J3` | `=H3+I3` |  |
| `H4` | `=D8` |  |
| `I4` | `=D20` |  |
| `J4` | `=H4+I4` |  |
| `H5` | `=D9` |  |
| `I5` | `=D21` |  |
| `J5` | `=H5+I5` |  |
| `H6` | `=D10` |  |
| `I6` | `=D22` |  |
| `J6` | `=H6+I6` |  |
| `A7` | `='[1]Cálcul. trabalhado'!H4` | ✓ |
| `B7` | `=B2` |  |
| `C7` | `=B3*A7` |  |

**⚠️ Referências Externas detectadas:**

- `A7`: refs `['[1]']`
- `A8`: refs `['[1]']`
- `A9`: refs `['[1]']`
- `A10`: refs `['[1]']`
- `A11`: refs `['[1]']`
- `A12`: refs `['[1]']`
- `A19`: refs `['[1]']`
- `A20`: refs `['[1]']`
- `A21`: refs `['[1]']`
- `A22`: refs `['[1]']`

#### Aba: `Cálcul. trabalhado`

- Fórmulas: **72**
- Inputs numéricos: **73**
- Labels/Cabeçalhos: **39**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `F1`: Aluno por Hora
- `G1`: 10
- `H1`: Tx de Ocupação (% Hs)
- `I1`: Res. Mensal
- `F2`: Meta
- `A3`: 2026
- `B3`: Semana
- `D3`: Sábado
- `F3`: Meta
- `F4`: Meta
- `F5`: Meta
- `F6`: Meta
- `F7`: Meta
- `F8`: Meta
- `F9`: Meta
- `U10`: 6
- `S15`: Cenários dos anos e médias (info. GPT)
- `A16`: 2027
- `B16`: Semana
- `D16`: Sábado

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `B1` | `=#REF!` |  |
| `C1` | `=_xlfn.DAYS(B2,B1)` |  |
| `I2` | `=(($B$14+$D$14)*H2)` |  |
| `I3` | `=((B13+D13)*H3)` |  |
| `I4` | `=((B26+D26)*H4)` |  |
| `I5` | `=(B40+D40)*H5` |  |
| `I6` | `=(B40+D40)*H6` |  |
| `B7` | `=U9` |  |
| `D7` | `=U10` |  |
| `I7` | `=(B40+D40)*H7` |  |
| `B8` | `=$B$6*B7` |  |
| `D8` | `=D6*D7` |  |
| `I8` | `=(B40+D40)*H8` |  |
| `B9` | `=K20` |  |
| `D9` | `=K20` |  |

#### Aba: `Cálculo kit higiene`

- Fórmulas: **76**
- Inputs numéricos: **18**
- Labels/Cabeçalhos: **19**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Parâmetros
- `C1`: valores
- `E4`: Horas sábado func.
- `F4`: Horas domingo func.
- `G4`: Horas dias úteis func.
- `H4`: Dias úteis
- `E7`: Média de aulas dadas por dia/professor (dias vazios e cheios)
- `H7`: arredondando
- `A20`: Cálculos
- `A27`: Ano
- `B27`: Ocupação
- `D27`: Banhos profs./mês
- `E27`: Banhos totais/mês
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `H27`: Qtd.Reposições
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C2` | `=H8` |  |
| `C5` | `=H5*G5` |  |
| `C6` | `=E5+F5` |  |
| `C7` | `=C3*C5` |  |
| `C8` | `=C6*C3` |  |
| `E8` | `=('Cálcul. para definição benefic'!D31+'Cálcul. para definição benefic'!C31)/2` |  |
| `H8` | `=ROUNDDOWN(E8,1)` |  |
| `C9` | `=C7+C8` |  |
| `C10` | `=C9/C2` |  |
| `C11` | `=C10*4` |  |
| `C22` | `=C11` |  |
| `C23` | `=C21+C22` |  |
| `C24` | `=C12` |  |
| `C25` | `=C13` |  |
| `B28` | `='Cálcul. trabalhado'!H3` |  |

#### Aba: `Equipe`

- Fórmulas: **145**
- Inputs numéricos: **87**
- Labels/Cabeçalhos: **54**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: 2029
- `B2`: Equipe de 6 horas
- `D2`: Salário
- `E2`: Produtividade
- `F2`: R$ Produtiv.
- `G2`: Encargos + Benefícios
- `H2`: R$ Encargos
- `I2`: R$ Salário + Encargos + Produt.
- `J2`: Total
- `A12`: 2030
- `B12`: Equipe de 6 horas
- `D12`: Salário
- `E12`: Produtividade
- `F12`: R$ Produtiv.
- `G12`: Encargos + Benefícios
- `H12`: R$ Encargos
- `I12`: R$ Salário + Encargos + Produt.
- `J12`: Total
- `A22`: 2031
- `B22`: Equipe de 6 horas

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D3*G3` |  |
| `I3` | `=D3+H3` |  |
| `J3` | `=I3*C3` |  |
| `H4` | `=D4*G4` |  |
| `I4` | `=D4+H4+E4` |  |
| `J4` | `=I4*C4` |  |
| `F5` | `=E5*'Cálcul. trabalhado'!I3` |  |
| `H5` | `=(D5+F5)*G5` |  |
| `I5` | `=D5+H5+F5` |  |
| `J5` | `=I5*C5` |  |
| `H6` | `=D6*G6` |  |
| `I6` | `=D6+H6` |  |
| `J6` | `=I6*C6` |  |
| `H7` | `=D7*G7` |  |
| `I7` | `=D7+H7` |  |

#### Aba: `Orçamento máquinas`

- Fórmulas: **16**
- Inputs numéricos: **104**
- Labels/Cabeçalhos: **20**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: Equipamentos
- `D2`: TechnoGym
- `G2`: Lifefitness
- `J2`: Cimerian
- `M2`: Total Health
- `P2`: Buckler
- `R2`: Matrix
- `T2`: Fokus
- `A20`: Pesos livres
- `D20`: Poundfit
- `G20`: HubGym
- `J20`: Rotha
- `M20`: BRW Group
- `O20`: Bucker
- `A28`: Acessórios
- `D28`: Estimativa (aprox)
- `G28`: BRW Group
- `T36`: Valor total mínimo ~
- `T38`: Tech+Life+Matrix
- `T40`: total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D16` | `=D3+D4+D5+D6+D7+D9+D10+D11+D12` |  |
| `G16` | `=G3+G5+G6+G7+G9+G10+G11+G12+G4+G13+G14+G15` |  |
| `J16` | `=J3+J4+J5+J6+J7+J9+J10+J11+J12` |  |
| `M16` | `=M3+M4+M5+M6+M7+M9+M11+M12` |  |
| `P16` | `=P3+P4+P5+P6+P7+P9+P10+P11+P12+P14+T4+P15` |  |
| `R16` | `=R13+R14+R15` |  |
| `D26` | `=D21+D22+D23+D24` |  |
| `G26` | `=G21+G22+G23+G24` |  |
| `J26` | `=J21+J22+J23+J24+J25` |  |
| `M26` | `=M21+M22+M23+M24` |  |
| `O26` | `=O21+O22+O23+O24+O25` |  |
| `W36` | `=J16+J26+D46` |  |
| `W38` | `=G3+G4+G5+G6+G7+G9+T8+D11+D12+R13+R14+R15` |  |
| `W40` | `=W38+D46` |  |
| `D46` | `=D29+D30+D31+D32+D33+D34+D35+D36+D37+D38+D39+D40+D41+D42+D43+D44+D45` |  |

#### Aba: `Cronograma de ativ.`

- Fórmulas: **104**
- Inputs numéricos: **32**
- Labels/Cabeçalhos: **39**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `B1`: Inicio
- `C1`: Prazo (dias)
- `D1`: Término
- `E1`: Offset
- `A2`: Fase S (sistema)
- `B13`: Início
- `C13`: Prazo (dias)
- `D13`: Término
- `E13`: Offset
- `A14`: Fase I (Imóvel)
- `B21`: Início
- `C21`: Prazo (dias)
- `D21`: Término
- `E21`: Offset
- `A22`: Fase II (Contábil e legal)
- `C22`: 10
- `B29`: Início
- `C29`: Prazo (dias)
- `D29`: Término
- `E29`: Offset

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=D10` |  |
| `D3` | `=B3+C3` |  |
| `E3` | `=B3-DATE(2025,10,1)` |  |
| `D4` | `=B4+C4` |  |
| `E4` | `=B4-DATE(2025,10,1)` |  |
| `B5` | `=D4` |  |
| `D5` | `=B5+C5` |  |
| `E5` | `=B5-DATE(2025,10,1)` |  |
| `B6` | `=D5` |  |
| `D6` | `=B6+C6` |  |
| `E6` | `=B6-DATE(2025,10,1)` |  |
| `B7` | `=D6` |  |
| `D7` | `=B7+C7` |  |
| `E7` | `=B7-DATE(2025,10,1)` |  |
| `B8` | `=D7` |  |

#### Aba: `Cálcul. para definição benefic`

- Fórmulas: **0**
- Inputs numéricos: **27**
- Labels/Cabeçalhos: **30**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A28`: Estastística descritiva
- `F28`: Interpretção dos dados
- `P28`: Critérios para definição da faixa ideal de aulas/mês por plano
- `A29`: indicador
- `B29`: aulas/mês
- `C29`: Dia cheio
- `D29`: Dia vazio
- `F29`: Distribuição mensal é muito dispersa
- `A30`: amostra n
- `A31`: média
- `F31`: Média mensal de aulas dadas
- `A32`: mediana
- `A33`: moda
- `F33`: média mensal de aulas dadas (com IC 95%)
- `A34`: desvio s
- `A35`: mínimo
- `A36`: máximo
- `F36`: Dia cheio e dia vazio típicos
- `A37`: Q1 (25%)
- `A38`: Q3 (75%)

#### Aba: `Fórmulas fee para split`

- Fórmulas: **4**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **2**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Variáveis do sistema
- `B1`: Definições

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C3` | `=IF(C4>=110,50,IF(C4>=71,55,IF(C4>=41,60,IF(C4>=15,65,0))))` |  |
| `C5` | `=C6*(C2+C3)` |  |
| `C7` | `=C6*C3` |  |
| `C8` | `=C5-C7` |  |

#### Aba: `Benefícios Personal`

- Fórmulas: **16**
- Inputs numéricos: **24**
- Labels/Cabeçalhos: **27**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `B1`: Diamante
- `C1`: Ouro
- `D1`: Prata 
- `E1`: Bronze
- `A2`: Meta aulas dadas/mês
- `A3`: R$ Hora
- `H3`: Planos e faturamento mensal 
- `A4`: Internet
- `A5`: Bebodouro Água
- `H5`: Bronze
- `A6`: Banheiro
- `H6`: Prata
- `A7`: Banho
- `H7`: Ouro
- `A8`: Acesso Facial 
- `H8`: Diamante
- `A9`: Autonomia de imagem (sem uniformes obrigat.)
- `A11`: Hora para Treino Pessoal
- `A12`: Sala para Refeição

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `K5` | `=I5*J5` |  |
| `M5` | `=K5*L5` |  |
| `O5` | `=M5*N5` |  |
| `Q5` | `=P5*O5` |  |
| `K6` | `=I6*J6` |  |
| `M6` | `=K6*L6` |  |
| `O6` | `=M6*N6` |  |
| `Q6` | `=O6*P6` |  |
| `K7` | `=I7*J7` |  |
| `M7` | `=K7*L7` |  |
| `O7` | `=M7*N7` |  |
| `Q7` | `=O7*P7` |  |
| `K8` | `=I8*J8` |  |
| `M8` | `=K8*L8` |  |
| `O8` | `=M8*N8` |  |

#### Aba: `Benefícios aluno`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **4**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `A2`: Academia exclusiva
- `A4`: Sala de espera
- `A6`: Zero mensalidade

#### Aba: `Manifesto`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **0**
- Referências externas: **0**

#### Aba: `Concorrentes`

- Fórmulas: **12**
- Inputs numéricos: **33**
- Labels/Cabeçalhos: **22**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D2`: Academia Leven
- `I3`: R$ Pers.
- `A10`: Comparativo academias
- `A11`: Academia
- `D11`: Taxa p/ professor
- `F11`: Uniforme (cal/cam)
- `H11`: ~ mensalidade p/ aluno
- `K11`: Benefícios para o professor
- `A12`: Bodytech (Eldorado/Leopoldo)
- `A13`: Bodytech (Iguatemi)
- `A14`: Bodytech (JK)
- `A15`: Skyfit
- `A16`: Nation CT
- `A17`: Smartfit
- `A18`: Bio ritmo
- `A19`: Six Sport Life
- `A20`: Sett
- `A21`: Nossa academia
- `D21`: R$ 40 - R$ 60/aula
- `F21`: 0

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F4` | `=D4/E4` |  |
| `J4` | `=G4*I4` |  |
| `M4` | `=H4-L4` |  |
| `N4` | `=M4*G4` |  |
| `F5` | `=D5/E5` |  |
| `J5` | `=G5*I5` |  |
| `M5` | `=H5-L5` |  |
| `N5` | `=M5*G5` |  |
| `F6` | `=D6/E6` |  |
| `J6` | `=G6*I6` |  |
| `M6` | `=H6-L6` |  |
| `N6` | `=M6*G6` |  |

#### Aba: `Local`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **2**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Ambientes da academia (250m²)
- `A11`: Possíveis localizações 

#### Aba: `Sistema`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **0**
- Referências externas: **0**

---

### `Orçamento 16.0 - Quinta unidade (Alav.).xlsx`

**Abas (16):** `Orçamento`, `Custo investimento  `, `Financiamento`, `Água e luz`, `Cálcul. trabalhado`, `Cálculo kit higiene`, `Equipe`, `Orçamento máquinas`, `Cronograma de ativ.`, `Cálcul. para definição benefic`, `Benefícios Personal`, `Benefícios aluno`, `Manifesto`, `Concorrentes`, `Local`, `Sistema`

#### Aba: `Orçamento`

- Fórmulas: **3868**
- Inputs numéricos: **1976**
- Labels/Cabeçalhos: **208**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Item
- `B1`: Receita
- `C1`: 2029-08-01 00:00:00
- `D1`: 2029-09-01 00:00:00
- `E1`: 2029-10-01 00:00:00
- `F1`: 2029-11-01 00:00:00
- `G1`: 2029-12-01 00:00:00
- `H1`: 2030-01-01 00:00:00
- `I1`: 2030-02-01 00:00:00
- `J1`: 2030-03-01 00:00:00
- `K1`: 2030-04-01 00:00:00
- `L1`: 2030-05-01 00:00:00
- `M1`: 2030-06-01 00:00:00
- `N1`: 2030-07-01 00:00:00
- `O1`: 2030-08-01 00:00:00
- `P1`: 2030-09-01 00:00:00
- `Q1`: 2030-10-01 00:00:00
- `R1`: 2030-11-01 00:00:00
- `S1`: 2030-12-01 00:00:00
- `T1`: Total Acumulado Ano 1

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F2` | `=('Cálcul. trabalhado'!I3)/2` |  |
| `G2` | `=F2*2` |  |
| `H2` | `='Cálcul. trabalhado'!I4` |  |
| `I2` | `=H2` |  |
| `J2` | `=I2` |  |
| `K2` | `=J2` |  |
| `L2` | `=K2` |  |
| `M2` | `=L2` |  |
| `N2` | `=M2` |  |
| `O2` | `=N2` |  |
| `P2` | `=O2` |  |
| `Q2` | `=P2` |  |
| `R2` | `=Q2` |  |
| `S2` | `=R2` |  |
| `T2` | `=SUM(F2:S2)` |  |

#### Aba: `Custo investimento  `

- Fórmulas: **20**
- Inputs numéricos: **7**
- Labels/Cabeçalhos: **9**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Investimento - Unidade 5
- `A7`: Total
- `B9`: Origem do custo financeiro
- `B26`: Prazo médio de pagamentos (6 anos)
- `C26`: Meses
- `B27`: Custo financeiro mensal (simulado)
- `B28`: Custo financeiro total do período
- `B30`: Resultado líquido projetado da unidade
- `B31`: Resultado após custo do capital

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=Financiamento!C7+Financiamento!C8` |  |
| `D3` | `=Financiamento!C10` |  |
| `J3` | `=J2*J4` |  |
| `J4` | `=AVERAGE(Orçamento!C10:N10)` |  |
| `D6` | `=J3+J9` |  |
| `D7` | `=SUM(D2:E6)` |  |
| `J9` | `=-(J8*J10)` |  |
| `J10` | `=AVERAGE(Orçamento!F5:N5)` |  |
| `D11` | `=D2` |  |
| `D14` | `=D3+D4+D5` |  |
| `D17` | `=D6` |  |
| `D18` | `=2.2%` |  |
| `D20` | `=D11/$D$7` |  |
| `D21` | `=D14/$D$7` |  |
| `D22` | `=D17/$D$7` |  |

#### Aba: `Financiamento`

- Fórmulas: **45**
- Inputs numéricos: **28**
- Labels/Cabeçalhos: **7**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D22`: Máquinas
- `E22`: Pesos livres
- `F22`: Imóvel
- `G22`: Arquit. 
- `H22`: Branding
- `B29`: R$ Parcela
- `B30`: Total Parcelamento

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `E2` | `=C2*D2` |  |
| `F2` | `=F29` |  |
| `G2` | `=E2*30%` |  |
| `H2` | `=E2-G2` |  |
| `E3` | `=D3*C2` |  |
| `B5` | `=SUM(B6:B9)` |  |
| `D6` | `=C6*B6` |  |
| `F6` | `=E6*D6` |  |
| `G6` | `=D6-F6` |  |
| `C7` | `='Orçamento máquinas'!W40` |  |
| `D7` | `=C7*B7` |  |
| `F7` | `=E7*D7` |  |
| `G7` | `=D7-F7` |  |
| `H7` | `=D29` |  |
| `D8` | `=C8*B8` |  |

#### Aba: `Água e luz`

- Fórmulas: **66**
- Inputs numéricos: **17**
- Labels/Cabeçalhos: **18**
- Referências externas: **12**

**Principais labels/cabeçalhos detectados:**

- `A1`: Energia
- `B1`: Valor
- `F1`: Síntese
- `F2`: Ano
- `G2`: Ocupação
- `H2`: Energia
- `I2`: Água
- `J2`: Total
- `A6`: Ocupação
- `B6`: Parcela fixa
- `C6`: Parcela variável
- `D6`: Energia total
- `A14`: Água
- `B14`: Valor
- `A18`: Ocupação
- `B18`: Parcela fixa
- `C18`: Parcela variável
- `D18`: Água total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D7` |  |
| `I3` | `=D19` |  |
| `J3` | `=H3+I3` |  |
| `H4` | `=D8` |  |
| `I4` | `=D20` |  |
| `J4` | `=H4+I4` |  |
| `H5` | `=D9` |  |
| `I5` | `=D21` |  |
| `J5` | `=H5+I5` |  |
| `H6` | `=D10` |  |
| `I6` | `=D22` |  |
| `J6` | `=H6+I6` |  |
| `A7` | `='[1]Cálcul. trabalhado'!H4` | ✓ |
| `B7` | `=B2` |  |
| `C7` | `=B3*A7` |  |

**⚠️ Referências Externas detectadas:**

- `A7`: refs `['[1]']`
- `A8`: refs `['[1]']`
- `A9`: refs `['[1]']`
- `A10`: refs `['[1]']`
- `A11`: refs `['[1]']`
- `A12`: refs `['[1]']`
- `A19`: refs `['[1]']`
- `A20`: refs `['[1]']`
- `A21`: refs `['[1]']`
- `A22`: refs `['[1]']`

#### Aba: `Cálcul. trabalhado`

- Fórmulas: **72**
- Inputs numéricos: **74**
- Labels/Cabeçalhos: **39**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `F1`: Aluno por Hora
- `G1`: 10
- `H1`: Tx de Ocupação (% Hs)
- `I1`: Res. Mensal
- `F2`: Meta
- `A3`: 2026
- `B3`: Semana
- `D3`: Sábado
- `F3`: Meta
- `F4`: Meta
- `F5`: Meta
- `F6`: Meta
- `F7`: Meta
- `F8`: Meta
- `F9`: Meta
- `U10`: 6
- `S15`: Cenários dos anos e médias (info. GPT)
- `A16`: 2027
- `B16`: Semana
- `D16`: Sábado

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `B1` | `=#REF!` |  |
| `C1` | `=_xlfn.DAYS(B2,B1)` |  |
| `I2` | `=(($B$14+$D$14)*H2)` |  |
| `I3` | `=((B13+D13)*H3)` |  |
| `I4` | `=((B26+D26)*H4)` |  |
| `I5` | `=(B40+D40)*H5` |  |
| `I6` | `=(B40+D40)*H6` |  |
| `B7` | `=U9` |  |
| `D7` | `=U10` |  |
| `I7` | `=(B40+D40)*H7` |  |
| `B8` | `=$B$6*B7` |  |
| `D8` | `=D6*D7` |  |
| `I8` | `=(B40+D40)*H8` |  |
| `B9` | `=K20` |  |
| `D9` | `=K20` |  |

#### Aba: `Cálculo kit higiene`

- Fórmulas: **76**
- Inputs numéricos: **18**
- Labels/Cabeçalhos: **19**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Parâmetros
- `C1`: valores
- `E4`: Horas sábado func.
- `F4`: Horas domingo func.
- `G4`: Horas dias úteis func.
- `H4`: Dias úteis
- `E7`: Média de aulas dadas por dia/professor (dias vazios e cheios)
- `H7`: arredondando
- `A20`: Cálculos
- `A27`: Ano
- `B27`: Ocupação
- `D27`: Banhos profs./mês
- `E27`: Banhos totais/mês
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `H27`: Qtd.Reposições
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C2` | `=H8` |  |
| `C5` | `=H5*G5` |  |
| `C6` | `=E5+F5` |  |
| `C7` | `=C3*C5` |  |
| `C8` | `=C6*C3` |  |
| `E8` | `=('Cálcul. para definição benefic'!D31+'Cálcul. para definição benefic'!C31)/2` |  |
| `H8` | `=ROUNDDOWN(E8,1)` |  |
| `C9` | `=C7+C8` |  |
| `C10` | `=C9/C2` |  |
| `C11` | `=C10*4` |  |
| `C22` | `=C11` |  |
| `C23` | `=C21+C22` |  |
| `C24` | `=C12` |  |
| `C25` | `=C13` |  |
| `B28` | `='Cálcul. trabalhado'!H3` |  |

#### Aba: `Equipe`

- Fórmulas: **145**
- Inputs numéricos: **87**
- Labels/Cabeçalhos: **54**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: 2031
- `B2`: Equipe de 6 horas
- `D2`: Salário
- `E2`: Produtividade
- `F2`: R$ Produtiv.
- `G2`: Encargos + Benefícios
- `H2`: R$ Encargos
- `I2`: R$ Salário + Encargos + Produt.
- `J2`: Total
- `A12`: 2032
- `B12`: Equipe de 6 horas
- `D12`: Salário
- `E12`: Produtividade
- `F12`: R$ Produtiv.
- `G12`: Encargos + Benefícios
- `H12`: R$ Encargos
- `I12`: R$ Salário + Encargos + Produt.
- `J12`: Total
- `A22`: 2033
- `B22`: Equipe de 6 horas

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D3*G3` |  |
| `I3` | `=D3+H3` |  |
| `J3` | `=I3*C3` |  |
| `H4` | `=D4*G4` |  |
| `I4` | `=D4+H4+E4` |  |
| `J4` | `=I4*C4` |  |
| `F5` | `=E5*'Cálcul. trabalhado'!I3` |  |
| `H5` | `=(D5+F5)*G5` |  |
| `I5` | `=D5+H5+F5` |  |
| `J5` | `=I5*C5` |  |
| `H6` | `=D6*G6` |  |
| `I6` | `=D6+H6` |  |
| `J6` | `=I6*C6` |  |
| `H7` | `=D7*G7` |  |
| `I7` | `=D7+H7` |  |

#### Aba: `Orçamento máquinas`

- Fórmulas: **16**
- Inputs numéricos: **104**
- Labels/Cabeçalhos: **20**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: Equipamentos
- `D2`: TechnoGym
- `G2`: Lifefitness
- `J2`: Cimerian
- `M2`: Total Health
- `P2`: Buckler
- `R2`: Matrix
- `T2`: Fokus
- `A20`: Pesos livres
- `D20`: Poundfit
- `G20`: HubGym
- `J20`: Rotha
- `M20`: BRW Group
- `O20`: Bucker
- `A28`: Acessórios
- `D28`: Estimativa (aprox)
- `G28`: BRW Group
- `T36`: Valor total mínimo ~
- `T38`: Tech+Life+Matrix
- `T40`: total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D16` | `=D3+D4+D5+D6+D7+D9+D10+D11+D12` |  |
| `G16` | `=G3+G5+G6+G7+G9+G10+G11+G12+G4+G13+G14+G15` |  |
| `J16` | `=J3+J4+J5+J6+J7+J9+J10+J11+J12` |  |
| `M16` | `=M3+M4+M5+M6+M7+M9+M11+M12` |  |
| `P16` | `=P3+P4+P5+P6+P7+P9+P10+P11+P12+P14+T4+P15` |  |
| `R16` | `=R13+R14+R15` |  |
| `D26` | `=D21+D22+D23+D24` |  |
| `G26` | `=G21+G22+G23+G24` |  |
| `J26` | `=J21+J22+J23+J24+J25` |  |
| `M26` | `=M21+M22+M23+M24` |  |
| `O26` | `=O21+O22+O23+O24+O25` |  |
| `W36` | `=J16+J26+D46` |  |
| `W38` | `=G3+G4+G5+G6+G7+G9+T8+D11+D12+R13+R14+R15` |  |
| `W40` | `=W38+D46` |  |
| `D46` | `=D29+D30+D31+D32+D33+D34+D35+D36+D37+D38+D39+D40+D41+D42+D43+D44+D45` |  |

#### Aba: `Cronograma de ativ.`

- Fórmulas: **104**
- Inputs numéricos: **32**
- Labels/Cabeçalhos: **39**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `B1`: Inicio
- `C1`: Prazo (dias)
- `D1`: Término
- `E1`: Offset
- `A2`: Fase S (sistema)
- `B13`: Início
- `C13`: Prazo (dias)
- `D13`: Término
- `E13`: Offset
- `A14`: Fase I (Imóvel)
- `B21`: Início
- `C21`: Prazo (dias)
- `D21`: Término
- `E21`: Offset
- `A22`: Fase II (Contábil e legal)
- `C22`: 10
- `B29`: Início
- `C29`: Prazo (dias)
- `D29`: Término
- `E29`: Offset

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=D10` |  |
| `D3` | `=B3+C3` |  |
| `E3` | `=B3-DATE(2025,10,1)` |  |
| `D4` | `=B4+C4` |  |
| `E4` | `=B4-DATE(2025,10,1)` |  |
| `B5` | `=D4` |  |
| `D5` | `=B5+C5` |  |
| `E5` | `=B5-DATE(2025,10,1)` |  |
| `B6` | `=D5` |  |
| `D6` | `=B6+C6` |  |
| `E6` | `=B6-DATE(2025,10,1)` |  |
| `B7` | `=D6` |  |
| `D7` | `=B7+C7` |  |
| `E7` | `=B7-DATE(2025,10,1)` |  |
| `B8` | `=D7` |  |

#### Aba: `Cálcul. para definição benefic`

- Fórmulas: **0**
- Inputs numéricos: **27**
- Labels/Cabeçalhos: **30**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A28`: Estastística descritiva
- `F28`: Interpretção dos dados
- `P28`: Critérios para definição da faixa ideal de aulas/mês por plano
- `A29`: indicador
- `B29`: aulas/mês
- `C29`: Dia cheio
- `D29`: Dia vazio
- `F29`: Distribuição mensal é muito dispersa
- `A30`: amostra n
- `A31`: média
- `F31`: Média mensal de aulas dadas
- `A32`: mediana
- `A33`: moda
- `F33`: média mensal de aulas dadas (com IC 95%)
- `A34`: desvio s
- `A35`: mínimo
- `A36`: máximo
- `F36`: Dia cheio e dia vazio típicos
- `A37`: Q1 (25%)
- `A38`: Q3 (75%)

#### Aba: `Benefícios Personal`

- Fórmulas: **16**
- Inputs numéricos: **24**
- Labels/Cabeçalhos: **27**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `B1`: Diamante
- `C1`: Ouro
- `D1`: Prata 
- `E1`: Bronze
- `A2`: Meta aulas dadas/mês
- `A3`: R$ Hora
- `H3`: Planos e faturamento mensal 
- `A4`: Internet
- `A5`: Bebodouro Água
- `H5`: Bronze
- `A6`: Banheiro
- `H6`: Prata
- `A7`: Banho
- `H7`: Ouro
- `A8`: Acesso Facial 
- `H8`: Diamante
- `A9`: Autonomia de imagem (sem uniformes obrigat.)
- `A11`: Hora para Treino Pessoal
- `A12`: Sala para Refeição

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `K5` | `=I5*J5` |  |
| `M5` | `=K5*L5` |  |
| `O5` | `=M5*N5` |  |
| `Q5` | `=P5*O5` |  |
| `K6` | `=I6*J6` |  |
| `M6` | `=K6*L6` |  |
| `O6` | `=M6*N6` |  |
| `Q6` | `=O6*P6` |  |
| `K7` | `=I7*J7` |  |
| `M7` | `=K7*L7` |  |
| `O7` | `=M7*N7` |  |
| `Q7` | `=O7*P7` |  |
| `K8` | `=I8*J8` |  |
| `M8` | `=K8*L8` |  |
| `O8` | `=M8*N8` |  |

#### Aba: `Benefícios aluno`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **4**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `A2`: Academia exclusiva
- `A4`: Sala de espera
- `A6`: Zero mensalidade

#### Aba: `Manifesto`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **0**
- Referências externas: **0**

#### Aba: `Concorrentes`

- Fórmulas: **12**
- Inputs numéricos: **33**
- Labels/Cabeçalhos: **22**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D2`: Academia Leven
- `I3`: R$ Pers.
- `A10`: Comparativo academias
- `A11`: Academia
- `D11`: Taxa p/ professor
- `F11`: Uniforme (cal/cam)
- `H11`: ~ mensalidade p/ aluno
- `K11`: Benefícios para o professor
- `A12`: Bodytech (Eldorado/Leopoldo)
- `A13`: Bodytech (Iguatemi)
- `A14`: Bodytech (JK)
- `A15`: Skyfit
- `A16`: Nation CT
- `A17`: Smartfit
- `A18`: Bio ritmo
- `A19`: Six Sport Life
- `A20`: Sett
- `A21`: Nossa academia
- `D21`: R$ 40 - R$ 60/aula
- `F21`: 0

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F4` | `=D4/E4` |  |
| `J4` | `=G4*I4` |  |
| `M4` | `=H4-L4` |  |
| `N4` | `=M4*G4` |  |
| `F5` | `=D5/E5` |  |
| `J5` | `=G5*I5` |  |
| `M5` | `=H5-L5` |  |
| `N5` | `=M5*G5` |  |
| `F6` | `=D6/E6` |  |
| `J6` | `=G6*I6` |  |
| `M6` | `=H6-L6` |  |
| `N6` | `=M6*G6` |  |

#### Aba: `Local`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **2**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Ambientes da academia (250m²)
- `A11`: Possíveis localizações 

#### Aba: `Sistema`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **0**
- Referências externas: **0**

---

### `Orçamento 16.0 - Sexta unidade (Alav.).xlsx`

**Abas (17):** `Orçamento`, `Custo investimento `, `Financiamento`, `Água e luz`, `Cálcul. trabalhado`, `Cálculo kit higiene`, `Equipe`, `Orçamento máquinas`, `Cronograma de ativ.`, `Cálcul. para definição benefic`, `Fórmulas fee para split`, `Benefícios Personal`, `Benefícios aluno`, `Manifesto`, `Concorrentes`, `Local`, `Sistema`

#### Aba: `Orçamento`

- Fórmulas: **3678**
- Inputs numéricos: **1826**
- Labels/Cabeçalhos: **198**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Item
- `B1`: Receita
- `C1`: 2030-01-01 00:00:00
- `D1`: 2030-02-01 00:00:00
- `E1`: 2030-03-01 00:00:00
- `F1`: 2030-04-01 00:00:00
- `G1`: 2030-05-01 00:00:00
- `H1`: 2030-06-01 00:00:00
- `I1`: 2030-07-01 00:00:00
- `J1`: 2030-08-01 00:00:00
- `K1`: 2030-09-01 00:00:00
- `L1`: 2030-10-01 00:00:00
- `M1`: 2030-11-01 00:00:00
- `N1`: 2030-12-01 00:00:00
- `T1`: Total Acumulado Ano 1
- `U1`: 2031-01-01 00:00:00
- `V1`: 2031-02-01 00:00:00
- `W1`: 2031-03-01 00:00:00
- `X1`: 2031-04-01 00:00:00
- `Y1`: 2031-05-01 00:00:00

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F2` | `=('Cálcul. trabalhado'!I3)/2` |  |
| `G2` | `=F2*2` |  |
| `H2` | `='Cálcul. trabalhado'!I4` |  |
| `I2` | `=H2` |  |
| `J2` | `=I2` |  |
| `K2` | `=J2` |  |
| `L2` | `=K2` |  |
| `M2` | `=L2` |  |
| `N2` | `=M2` |  |
| `T2` | `=SUM(F2:S2)` |  |
| `U2` | `='Cálcul. trabalhado'!I5` |  |
| `V2` | `=U2` |  |
| `W2` | `=V2` |  |
| `X2` | `=W2` |  |
| `Y2` | `=X2` |  |

#### Aba: `Custo investimento `

- Fórmulas: **20**
- Inputs numéricos: **7**
- Labels/Cabeçalhos: **9**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Investimento - Unidade 6
- `A7`: Total
- `B9`: Origem do custo financeiro
- `B26`: Prazo médio de pagamentos (6 anos)
- `C26`: Meses
- `B27`: Custo financeiro mensal (simulado)
- `B28`: Custo financeiro total do período
- `B30`: Resultado líquido projetado da unidade
- `B31`: Resultado após custo do capital

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=Financiamento!C7+Financiamento!C8` |  |
| `D3` | `=Financiamento!C10` |  |
| `J3` | `=J2*J4` |  |
| `J4` | `=AVERAGE(Orçamento!C10:N10)` |  |
| `D6` | `=J3+J9` |  |
| `D7` | `=SUM(D2:E6)` |  |
| `J9` | `=-(J8*J10)` |  |
| `J10` | `=AVERAGE(Orçamento!F5:N5)` |  |
| `D11` | `=D2` |  |
| `D14` | `=D3+D4+D5` |  |
| `D17` | `=D6` |  |
| `D18` | `=2.2%` |  |
| `D20` | `=D11/$D$7` |  |
| `D21` | `=D14/$D$7` |  |
| `D22` | `=D17/$D$7` |  |

#### Aba: `Financiamento`

- Fórmulas: **45**
- Inputs numéricos: **28**
- Labels/Cabeçalhos: **7**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D22`: Máquinas
- `E22`: Pesos livres
- `F22`: Imóvel
- `G22`: Arquit. 
- `H22`: Branding
- `B29`: R$ Parcela
- `B30`: Total Parcelamento

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `E2` | `=C2*D2` |  |
| `F2` | `=F29` |  |
| `G2` | `=E2*30%` |  |
| `H2` | `=E2-G2` |  |
| `E3` | `=D3*C2` |  |
| `B5` | `=SUM(B6:B9)` |  |
| `D6` | `=C6*B6` |  |
| `F6` | `=E6*D6` |  |
| `G6` | `=D6-F6` |  |
| `C7` | `='Orçamento máquinas'!W40` |  |
| `D7` | `=C7*B7` |  |
| `F7` | `=E7*D7` |  |
| `G7` | `=D7-F7` |  |
| `H7` | `=D29` |  |
| `D8` | `=C8*B8` |  |

#### Aba: `Água e luz`

- Fórmulas: **66**
- Inputs numéricos: **17**
- Labels/Cabeçalhos: **18**
- Referências externas: **12**

**Principais labels/cabeçalhos detectados:**

- `A1`: Energia
- `B1`: Valor
- `F1`: Síntese
- `F2`: Ano
- `G2`: Ocupação
- `H2`: Energia
- `I2`: Água
- `J2`: Total
- `A6`: Ocupação
- `B6`: Parcela fixa
- `C6`: Parcela variável
- `D6`: Energia total
- `A14`: Água
- `B14`: Valor
- `A18`: Ocupação
- `B18`: Parcela fixa
- `C18`: Parcela variável
- `D18`: Água total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D7` |  |
| `I3` | `=D19` |  |
| `J3` | `=H3+I3` |  |
| `H4` | `=D8` |  |
| `I4` | `=D20` |  |
| `J4` | `=H4+I4` |  |
| `H5` | `=D9` |  |
| `I5` | `=D21` |  |
| `J5` | `=H5+I5` |  |
| `H6` | `=D10` |  |
| `I6` | `=D22` |  |
| `J6` | `=H6+I6` |  |
| `A7` | `='[1]Cálcul. trabalhado'!H4` | ✓ |
| `B7` | `=B2` |  |
| `C7` | `=B3*A7` |  |

**⚠️ Referências Externas detectadas:**

- `A7`: refs `['[1]']`
- `A8`: refs `['[1]']`
- `A9`: refs `['[1]']`
- `A10`: refs `['[1]']`
- `A11`: refs `['[1]']`
- `A12`: refs `['[1]']`
- `A19`: refs `['[1]']`
- `A20`: refs `['[1]']`
- `A21`: refs `['[1]']`
- `A22`: refs `['[1]']`

#### Aba: `Cálcul. trabalhado`

- Fórmulas: **72**
- Inputs numéricos: **73**
- Labels/Cabeçalhos: **39**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `F1`: Aluno por Hora
- `G1`: 10
- `H1`: Tx de Ocupação (% Hs)
- `I1`: Res. Mensal
- `F2`: Meta
- `A3`: 2026
- `B3`: Semana
- `D3`: Sábado
- `F3`: Meta
- `F4`: Meta
- `F5`: Meta
- `F6`: Meta
- `F7`: Meta
- `F8`: Meta
- `F9`: Meta
- `U10`: 6
- `S15`: Cenários dos anos e médias (info. GPT)
- `A16`: 2027
- `B16`: Semana
- `D16`: Sábado

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `B1` | `=#REF!` |  |
| `C1` | `=_xlfn.DAYS(B2,B1)` |  |
| `I2` | `=(($B$14+$D$14)*H2)` |  |
| `I3` | `=((B13+D13)*H3)` |  |
| `I4` | `=((B26+D26)*H4)` |  |
| `I5` | `=(B40+D40)*H5` |  |
| `I6` | `=(B40+D40)*H6` |  |
| `B7` | `=U9` |  |
| `D7` | `=U10` |  |
| `I7` | `=(B40+D40)*H7` |  |
| `B8` | `=$B$6*B7` |  |
| `D8` | `=D6*D7` |  |
| `I8` | `=(B40+D40)*H8` |  |
| `B9` | `=K20` |  |
| `D9` | `=K20` |  |

#### Aba: `Cálculo kit higiene`

- Fórmulas: **76**
- Inputs numéricos: **18**
- Labels/Cabeçalhos: **19**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Parâmetros
- `C1`: valores
- `E4`: Horas sábado func.
- `F4`: Horas domingo func.
- `G4`: Horas dias úteis func.
- `H4`: Dias úteis
- `E7`: Média de aulas dadas por dia/professor (dias vazios e cheios)
- `H7`: arredondando
- `A20`: Cálculos
- `A27`: Ano
- `B27`: Ocupação
- `D27`: Banhos profs./mês
- `E27`: Banhos totais/mês
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `H27`: Qtd.Reposições
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C2` | `=H8` |  |
| `C5` | `=H5*G5` |  |
| `C6` | `=E5+F5` |  |
| `C7` | `=C3*C5` |  |
| `C8` | `=C6*C3` |  |
| `E8` | `=('Cálcul. para definição benefic'!D31+'Cálcul. para definição benefic'!C31)/2` |  |
| `H8` | `=ROUNDDOWN(E8,1)` |  |
| `C9` | `=C7+C8` |  |
| `C10` | `=C9/C2` |  |
| `C11` | `=C10*4` |  |
| `C22` | `=C11` |  |
| `C23` | `=C21+C22` |  |
| `C24` | `=C12` |  |
| `C25` | `=C13` |  |
| `B28` | `='Cálcul. trabalhado'!H3` |  |

#### Aba: `Equipe`

- Fórmulas: **145**
- Inputs numéricos: **87**
- Labels/Cabeçalhos: **54**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: 2029
- `B2`: Equipe de 6 horas
- `D2`: Salário
- `E2`: Produtividade
- `F2`: R$ Produtiv.
- `G2`: Encargos + Benefícios
- `H2`: R$ Encargos
- `I2`: R$ Salário + Encargos + Produt.
- `J2`: Total
- `A12`: 2030
- `B12`: Equipe de 6 horas
- `D12`: Salário
- `E12`: Produtividade
- `F12`: R$ Produtiv.
- `G12`: Encargos + Benefícios
- `H12`: R$ Encargos
- `I12`: R$ Salário + Encargos + Produt.
- `J12`: Total
- `A22`: 2031
- `B22`: Equipe de 6 horas

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D3*G3` |  |
| `I3` | `=D3+H3` |  |
| `J3` | `=I3*C3` |  |
| `H4` | `=D4*G4` |  |
| `I4` | `=D4+H4+E4` |  |
| `J4` | `=I4*C4` |  |
| `F5` | `=E5*'Cálcul. trabalhado'!I3` |  |
| `H5` | `=(D5+F5)*G5` |  |
| `I5` | `=D5+H5+F5` |  |
| `J5` | `=I5*C5` |  |
| `H6` | `=D6*G6` |  |
| `I6` | `=D6+H6` |  |
| `J6` | `=I6*C6` |  |
| `H7` | `=D7*G7` |  |
| `I7` | `=D7+H7` |  |

#### Aba: `Orçamento máquinas`

- Fórmulas: **16**
- Inputs numéricos: **104**
- Labels/Cabeçalhos: **20**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: Equipamentos
- `D2`: TechnoGym
- `G2`: Lifefitness
- `J2`: Cimerian
- `M2`: Total Health
- `P2`: Buckler
- `R2`: Matrix
- `T2`: Fokus
- `A20`: Pesos livres
- `D20`: Poundfit
- `G20`: HubGym
- `J20`: Rotha
- `M20`: BRW Group
- `O20`: Bucker
- `A28`: Acessórios
- `D28`: Estimativa (aprox)
- `G28`: BRW Group
- `T36`: Valor total mínimo ~
- `T38`: Tech+Life+Matrix
- `T40`: total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D16` | `=D3+D4+D5+D6+D7+D9+D10+D11+D12` |  |
| `G16` | `=G3+G5+G6+G7+G9+G10+G11+G12+G4+G13+G14+G15` |  |
| `J16` | `=J3+J4+J5+J6+J7+J9+J10+J11+J12` |  |
| `M16` | `=M3+M4+M5+M6+M7+M9+M11+M12` |  |
| `P16` | `=P3+P4+P5+P6+P7+P9+P10+P11+P12+P14+T4+P15` |  |
| `R16` | `=R13+R14+R15` |  |
| `D26` | `=D21+D22+D23+D24` |  |
| `G26` | `=G21+G22+G23+G24` |  |
| `J26` | `=J21+J22+J23+J24+J25` |  |
| `M26` | `=M21+M22+M23+M24` |  |
| `O26` | `=O21+O22+O23+O24+O25` |  |
| `W36` | `=J16+J26+D46` |  |
| `W38` | `=G3+G4+G5+G6+G7+G9+T8+D11+D12+R13+R14+R15` |  |
| `W40` | `=W38+D46` |  |
| `D46` | `=D29+D30+D31+D32+D33+D34+D35+D36+D37+D38+D39+D40+D41+D42+D43+D44+D45` |  |

#### Aba: `Cronograma de ativ.`

- Fórmulas: **104**
- Inputs numéricos: **32**
- Labels/Cabeçalhos: **39**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `B1`: Inicio
- `C1`: Prazo (dias)
- `D1`: Término
- `E1`: Offset
- `A2`: Fase S (sistema)
- `B13`: Início
- `C13`: Prazo (dias)
- `D13`: Término
- `E13`: Offset
- `A14`: Fase I (Imóvel)
- `B21`: Início
- `C21`: Prazo (dias)
- `D21`: Término
- `E21`: Offset
- `A22`: Fase II (Contábil e legal)
- `C22`: 10
- `B29`: Início
- `C29`: Prazo (dias)
- `D29`: Término
- `E29`: Offset

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=D10` |  |
| `D3` | `=B3+C3` |  |
| `E3` | `=B3-DATE(2025,10,1)` |  |
| `D4` | `=B4+C4` |  |
| `E4` | `=B4-DATE(2025,10,1)` |  |
| `B5` | `=D4` |  |
| `D5` | `=B5+C5` |  |
| `E5` | `=B5-DATE(2025,10,1)` |  |
| `B6` | `=D5` |  |
| `D6` | `=B6+C6` |  |
| `E6` | `=B6-DATE(2025,10,1)` |  |
| `B7` | `=D6` |  |
| `D7` | `=B7+C7` |  |
| `E7` | `=B7-DATE(2025,10,1)` |  |
| `B8` | `=D7` |  |

#### Aba: `Cálcul. para definição benefic`

- Fórmulas: **0**
- Inputs numéricos: **27**
- Labels/Cabeçalhos: **30**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A28`: Estastística descritiva
- `F28`: Interpretção dos dados
- `P28`: Critérios para definição da faixa ideal de aulas/mês por plano
- `A29`: indicador
- `B29`: aulas/mês
- `C29`: Dia cheio
- `D29`: Dia vazio
- `F29`: Distribuição mensal é muito dispersa
- `A30`: amostra n
- `A31`: média
- `F31`: Média mensal de aulas dadas
- `A32`: mediana
- `A33`: moda
- `F33`: média mensal de aulas dadas (com IC 95%)
- `A34`: desvio s
- `A35`: mínimo
- `A36`: máximo
- `F36`: Dia cheio e dia vazio típicos
- `A37`: Q1 (25%)
- `A38`: Q3 (75%)

#### Aba: `Fórmulas fee para split`

- Fórmulas: **4**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **2**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Variáveis do sistema
- `B1`: Definições

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C3` | `=IF(C4>=110,50,IF(C4>=71,55,IF(C4>=41,60,IF(C4>=15,65,0))))` |  |
| `C5` | `=C6*(C2+C3)` |  |
| `C7` | `=C6*C3` |  |
| `C8` | `=C5-C7` |  |

#### Aba: `Benefícios Personal`

- Fórmulas: **16**
- Inputs numéricos: **24**
- Labels/Cabeçalhos: **27**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `B1`: Diamante
- `C1`: Ouro
- `D1`: Prata 
- `E1`: Bronze
- `A2`: Meta aulas dadas/mês
- `A3`: R$ Hora
- `H3`: Planos e faturamento mensal 
- `A4`: Internet
- `A5`: Bebodouro Água
- `H5`: Bronze
- `A6`: Banheiro
- `H6`: Prata
- `A7`: Banho
- `H7`: Ouro
- `A8`: Acesso Facial 
- `H8`: Diamante
- `A9`: Autonomia de imagem (sem uniformes obrigat.)
- `A11`: Hora para Treino Pessoal
- `A12`: Sala para Refeição

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `K5` | `=I5*J5` |  |
| `M5` | `=K5*L5` |  |
| `O5` | `=M5*N5` |  |
| `Q5` | `=P5*O5` |  |
| `K6` | `=I6*J6` |  |
| `M6` | `=K6*L6` |  |
| `O6` | `=M6*N6` |  |
| `Q6` | `=O6*P6` |  |
| `K7` | `=I7*J7` |  |
| `M7` | `=K7*L7` |  |
| `O7` | `=M7*N7` |  |
| `Q7` | `=O7*P7` |  |
| `K8` | `=I8*J8` |  |
| `M8` | `=K8*L8` |  |
| `O8` | `=M8*N8` |  |

#### Aba: `Benefícios aluno`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **4**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `A2`: Academia exclusiva
- `A4`: Sala de espera
- `A6`: Zero mensalidade

#### Aba: `Manifesto`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **0**
- Referências externas: **0**

#### Aba: `Concorrentes`

- Fórmulas: **12**
- Inputs numéricos: **33**
- Labels/Cabeçalhos: **22**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D2`: Academia Leven
- `I3`: R$ Pers.
- `A10`: Comparativo academias
- `A11`: Academia
- `D11`: Taxa p/ professor
- `F11`: Uniforme (cal/cam)
- `H11`: ~ mensalidade p/ aluno
- `K11`: Benefícios para o professor
- `A12`: Bodytech (Eldorado/Leopoldo)
- `A13`: Bodytech (Iguatemi)
- `A14`: Bodytech (JK)
- `A15`: Skyfit
- `A16`: Nation CT
- `A17`: Smartfit
- `A18`: Bio ritmo
- `A19`: Six Sport Life
- `A20`: Sett
- `A21`: Nossa academia
- `D21`: R$ 40 - R$ 60/aula
- `F21`: 0

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F4` | `=D4/E4` |  |
| `J4` | `=G4*I4` |  |
| `M4` | `=H4-L4` |  |
| `N4` | `=M4*G4` |  |
| `F5` | `=D5/E5` |  |
| `J5` | `=G5*I5` |  |
| `M5` | `=H5-L5` |  |
| `N5` | `=M5*G5` |  |
| `F6` | `=D6/E6` |  |
| `J6` | `=G6*I6` |  |
| `M6` | `=H6-L6` |  |
| `N6` | `=M6*G6` |  |

#### Aba: `Local`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **2**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Ambientes da academia (250m²)
- `A11`: Possíveis localizações 

#### Aba: `Sistema`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **0**
- Referências externas: **0**

---

### `Orçamento 16.0 - Sétima unidade (Alav.).xlsx`

**Abas (16):** `Orçamento`, `Custo investimento  `, `Financiamento`, `Água e luz`, `Cálcul. trabalhado`, `Cálculo kit higiene`, `Equipe`, `Orçamento máquinas`, `Cronograma de ativ.`, `Cálcul. para definição benefic`, `Benefícios Personal`, `Benefícios aluno`, `Manifesto`, `Concorrentes`, `Local`, `Sistema`

#### Aba: `Orçamento`

- Fórmulas: **3868**
- Inputs numéricos: **1976**
- Labels/Cabeçalhos: **208**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Item
- `B1`: Receita
- `C1`: 2030-08-01 00:00:00
- `D1`: 2030-09-01 00:00:00
- `E1`: 2030-10-01 00:00:00
- `F1`: 2030-11-01 00:00:00
- `G1`: 2030-12-01 00:00:00
- `H1`: 2031-01-01 00:00:00
- `I1`: 2031-02-01 00:00:00
- `J1`: 2031-03-01 00:00:00
- `K1`: 2031-04-01 00:00:00
- `L1`: 2031-05-01 00:00:00
- `M1`: 2031-06-01 00:00:00
- `N1`: 2031-07-01 00:00:00
- `O1`: 2031-08-01 00:00:00
- `P1`: 2031-09-01 00:00:00
- `Q1`: 2031-10-01 00:00:00
- `R1`: 2031-11-01 00:00:00
- `S1`: 2031-12-01 00:00:00
- `T1`: Total Acumulado Ano 1

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F2` | `=('Cálcul. trabalhado'!I3)/2` |  |
| `G2` | `=F2*2` |  |
| `H2` | `='Cálcul. trabalhado'!I4` |  |
| `I2` | `=H2` |  |
| `J2` | `=I2` |  |
| `K2` | `=J2` |  |
| `L2` | `=K2` |  |
| `M2` | `=L2` |  |
| `N2` | `=M2` |  |
| `O2` | `=N2` |  |
| `P2` | `=O2` |  |
| `Q2` | `=P2` |  |
| `R2` | `=Q2` |  |
| `S2` | `=R2` |  |
| `T2` | `=SUM(F2:S2)` |  |

#### Aba: `Custo investimento  `

- Fórmulas: **20**
- Inputs numéricos: **7**
- Labels/Cabeçalhos: **9**
- Referências externas: **2**

**Principais labels/cabeçalhos detectados:**

- `A1`: Investimento - Unidade 7
- `A7`: Total
- `B9`: Origem do custo financeiro
- `B26`: Prazo médio de pagamentos (6 anos)
- `C26`: Meses
- `B27`: Custo financeiro mensal (simulado)
- `B28`: Custo financeiro total do período
- `B30`: Resultado líquido projetado da unidade
- `B31`: Resultado após custo do capital

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=[1]Financiamento!C7+[1]Financiamento!C8` | ✓ |
| `D3` | `=[1]Financiamento!C10` | ✓ |
| `J3` | `=J2*J4` |  |
| `J4` | `=AVERAGE(Orçamento!C10:N10)` |  |
| `D6` | `=J3+J9` |  |
| `D7` | `=SUM(D2:E6)` |  |
| `J9` | `=-(J8*J10)` |  |
| `J10` | `=AVERAGE(Orçamento!F5:N5)` |  |
| `D11` | `=D2` |  |
| `D14` | `=D3+D4+D5` |  |
| `D17` | `=D6` |  |
| `D18` | `=2.2%` |  |
| `D20` | `=D11/$D$7` |  |
| `D21` | `=D14/$D$7` |  |
| `D22` | `=D17/$D$7` |  |

**⚠️ Referências Externas detectadas:**

- `D2`: refs `['[1]', '[1]']`
- `D3`: refs `['[1]']`

#### Aba: `Financiamento`

- Fórmulas: **45**
- Inputs numéricos: **28**
- Labels/Cabeçalhos: **7**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D22`: Máquinas
- `E22`: Pesos livres
- `F22`: Imóvel
- `G22`: Arquit. 
- `H22`: Branding
- `B29`: R$ Parcela
- `B30`: Total Parcelamento

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `E2` | `=C2*D2` |  |
| `F2` | `=F29` |  |
| `G2` | `=E2*30%` |  |
| `H2` | `=E2-G2` |  |
| `E3` | `=D3*C2` |  |
| `B5` | `=SUM(B6:B9)` |  |
| `D6` | `=C6*B6` |  |
| `F6` | `=E6*D6` |  |
| `G6` | `=D6-F6` |  |
| `C7` | `='Orçamento máquinas'!W40` |  |
| `D7` | `=C7*B7` |  |
| `F7` | `=E7*D7` |  |
| `G7` | `=D7-F7` |  |
| `H7` | `=D29` |  |
| `D8` | `=C8*B8` |  |

#### Aba: `Água e luz`

- Fórmulas: **66**
- Inputs numéricos: **17**
- Labels/Cabeçalhos: **18**
- Referências externas: **12**

**Principais labels/cabeçalhos detectados:**

- `A1`: Energia
- `B1`: Valor
- `F1`: Síntese
- `F2`: Ano
- `G2`: Ocupação
- `H2`: Energia
- `I2`: Água
- `J2`: Total
- `A6`: Ocupação
- `B6`: Parcela fixa
- `C6`: Parcela variável
- `D6`: Energia total
- `A14`: Água
- `B14`: Valor
- `A18`: Ocupação
- `B18`: Parcela fixa
- `C18`: Parcela variável
- `D18`: Água total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D7` |  |
| `I3` | `=D19` |  |
| `J3` | `=H3+I3` |  |
| `H4` | `=D8` |  |
| `I4` | `=D20` |  |
| `J4` | `=H4+I4` |  |
| `H5` | `=D9` |  |
| `I5` | `=D21` |  |
| `J5` | `=H5+I5` |  |
| `H6` | `=D10` |  |
| `I6` | `=D22` |  |
| `J6` | `=H6+I6` |  |
| `A7` | `='[2]Cálcul. trabalhado'!H4` | ✓ |
| `B7` | `=B2` |  |
| `C7` | `=B3*A7` |  |

**⚠️ Referências Externas detectadas:**

- `A7`: refs `['[2]']`
- `A8`: refs `['[2]']`
- `A9`: refs `['[2]']`
- `A10`: refs `['[2]']`
- `A11`: refs `['[2]']`
- `A12`: refs `['[2]']`
- `A19`: refs `['[2]']`
- `A20`: refs `['[2]']`
- `A21`: refs `['[2]']`
- `A22`: refs `['[2]']`

#### Aba: `Cálcul. trabalhado`

- Fórmulas: **72**
- Inputs numéricos: **74**
- Labels/Cabeçalhos: **39**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `F1`: Aluno por Hora
- `G1`: 10
- `H1`: Tx de Ocupação (% Hs)
- `I1`: Res. Mensal
- `F2`: Meta
- `A3`: 2026
- `B3`: Semana
- `D3`: Sábado
- `F3`: Meta
- `F4`: Meta
- `F5`: Meta
- `F6`: Meta
- `F7`: Meta
- `F8`: Meta
- `F9`: Meta
- `U10`: 6
- `S15`: Cenários dos anos e médias (info. GPT)
- `A16`: 2027
- `B16`: Semana
- `D16`: Sábado

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `B1` | `=#REF!` |  |
| `C1` | `=_xlfn.DAYS(B2,B1)` |  |
| `I2` | `=(($B$14+$D$14)*H2)` |  |
| `I3` | `=((B13+D13)*H3)` |  |
| `I4` | `=((B26+D26)*H4)` |  |
| `I5` | `=(B40+D40)*H5` |  |
| `I6` | `=(B40+D40)*H6` |  |
| `B7` | `=U9` |  |
| `D7` | `=U10` |  |
| `I7` | `=(B40+D40)*H7` |  |
| `B8` | `=$B$6*B7` |  |
| `D8` | `=D6*D7` |  |
| `I8` | `=(B40+D40)*H8` |  |
| `B9` | `=K20` |  |
| `D9` | `=K20` |  |

#### Aba: `Cálculo kit higiene`

- Fórmulas: **76**
- Inputs numéricos: **18**
- Labels/Cabeçalhos: **19**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Parâmetros
- `C1`: valores
- `E4`: Horas sábado func.
- `F4`: Horas domingo func.
- `G4`: Horas dias úteis func.
- `H4`: Dias úteis
- `E7`: Média de aulas dadas por dia/professor (dias vazios e cheios)
- `H7`: arredondando
- `A20`: Cálculos
- `A27`: Ano
- `B27`: Ocupação
- `D27`: Banhos profs./mês
- `E27`: Banhos totais/mês
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `H27`: Qtd.Reposições
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C2` | `=H8` |  |
| `C5` | `=H5*G5` |  |
| `C6` | `=E5+F5` |  |
| `C7` | `=C3*C5` |  |
| `C8` | `=C6*C3` |  |
| `E8` | `=('Cálcul. para definição benefic'!D31+'Cálcul. para definição benefic'!C31)/2` |  |
| `H8` | `=ROUNDDOWN(E8,1)` |  |
| `C9` | `=C7+C8` |  |
| `C10` | `=C9/C2` |  |
| `C11` | `=C10*4` |  |
| `C22` | `=C11` |  |
| `C23` | `=C21+C22` |  |
| `C24` | `=C12` |  |
| `C25` | `=C13` |  |
| `B28` | `='Cálcul. trabalhado'!H3` |  |

#### Aba: `Equipe`

- Fórmulas: **145**
- Inputs numéricos: **87**
- Labels/Cabeçalhos: **54**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: 2031
- `B2`: Equipe de 6 horas
- `D2`: Salário
- `E2`: Produtividade
- `F2`: R$ Produtiv.
- `G2`: Encargos + Benefícios
- `H2`: R$ Encargos
- `I2`: R$ Salário + Encargos + Produt.
- `J2`: Total
- `A12`: 2032
- `B12`: Equipe de 6 horas
- `D12`: Salário
- `E12`: Produtividade
- `F12`: R$ Produtiv.
- `G12`: Encargos + Benefícios
- `H12`: R$ Encargos
- `I12`: R$ Salário + Encargos + Produt.
- `J12`: Total
- `A22`: 2033
- `B22`: Equipe de 6 horas

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D3*G3` |  |
| `I3` | `=D3+H3` |  |
| `J3` | `=I3*C3` |  |
| `H4` | `=D4*G4` |  |
| `I4` | `=D4+H4+E4` |  |
| `J4` | `=I4*C4` |  |
| `F5` | `=E5*'Cálcul. trabalhado'!I3` |  |
| `H5` | `=(D5+F5)*G5` |  |
| `I5` | `=D5+H5+F5` |  |
| `J5` | `=I5*C5` |  |
| `H6` | `=D6*G6` |  |
| `I6` | `=D6+H6` |  |
| `J6` | `=I6*C6` |  |
| `H7` | `=D7*G7` |  |
| `I7` | `=D7+H7` |  |

#### Aba: `Orçamento máquinas`

- Fórmulas: **16**
- Inputs numéricos: **104**
- Labels/Cabeçalhos: **20**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: Equipamentos
- `D2`: TechnoGym
- `G2`: Lifefitness
- `J2`: Cimerian
- `M2`: Total Health
- `P2`: Buckler
- `R2`: Matrix
- `T2`: Fokus
- `A20`: Pesos livres
- `D20`: Poundfit
- `G20`: HubGym
- `J20`: Rotha
- `M20`: BRW Group
- `O20`: Bucker
- `A28`: Acessórios
- `D28`: Estimativa (aprox)
- `G28`: BRW Group
- `T36`: Valor total mínimo ~
- `T38`: Tech+Life+Matrix
- `T40`: total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D16` | `=D3+D4+D5+D6+D7+D9+D10+D11+D12` |  |
| `G16` | `=G3+G5+G6+G7+G9+G10+G11+G12+G4+G13+G14+G15` |  |
| `J16` | `=J3+J4+J5+J6+J7+J9+J10+J11+J12` |  |
| `M16` | `=M3+M4+M5+M6+M7+M9+M11+M12` |  |
| `P16` | `=P3+P4+P5+P6+P7+P9+P10+P11+P12+P14+T4+P15` |  |
| `R16` | `=R13+R14+R15` |  |
| `D26` | `=D21+D22+D23+D24` |  |
| `G26` | `=G21+G22+G23+G24` |  |
| `J26` | `=J21+J22+J23+J24+J25` |  |
| `M26` | `=M21+M22+M23+M24` |  |
| `O26` | `=O21+O22+O23+O24+O25` |  |
| `W36` | `=J16+J26+D46` |  |
| `W38` | `=G3+G4+G5+G6+G7+G9+T8+D11+D12+R13+R14+R15` |  |
| `W40` | `=W38+D46` |  |
| `D46` | `=D29+D30+D31+D32+D33+D34+D35+D36+D37+D38+D39+D40+D41+D42+D43+D44+D45` |  |

#### Aba: `Cronograma de ativ.`

- Fórmulas: **104**
- Inputs numéricos: **32**
- Labels/Cabeçalhos: **39**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `B1`: Inicio
- `C1`: Prazo (dias)
- `D1`: Término
- `E1`: Offset
- `A2`: Fase S (sistema)
- `B13`: Início
- `C13`: Prazo (dias)
- `D13`: Término
- `E13`: Offset
- `A14`: Fase I (Imóvel)
- `B21`: Início
- `C21`: Prazo (dias)
- `D21`: Término
- `E21`: Offset
- `A22`: Fase II (Contábil e legal)
- `C22`: 10
- `B29`: Início
- `C29`: Prazo (dias)
- `D29`: Término
- `E29`: Offset

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=D10` |  |
| `D3` | `=B3+C3` |  |
| `E3` | `=B3-DATE(2025,10,1)` |  |
| `D4` | `=B4+C4` |  |
| `E4` | `=B4-DATE(2025,10,1)` |  |
| `B5` | `=D4` |  |
| `D5` | `=B5+C5` |  |
| `E5` | `=B5-DATE(2025,10,1)` |  |
| `B6` | `=D5` |  |
| `D6` | `=B6+C6` |  |
| `E6` | `=B6-DATE(2025,10,1)` |  |
| `B7` | `=D6` |  |
| `D7` | `=B7+C7` |  |
| `E7` | `=B7-DATE(2025,10,1)` |  |
| `B8` | `=D7` |  |

#### Aba: `Cálcul. para definição benefic`

- Fórmulas: **0**
- Inputs numéricos: **27**
- Labels/Cabeçalhos: **30**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A28`: Estastística descritiva
- `F28`: Interpretção dos dados
- `P28`: Critérios para definição da faixa ideal de aulas/mês por plano
- `A29`: indicador
- `B29`: aulas/mês
- `C29`: Dia cheio
- `D29`: Dia vazio
- `F29`: Distribuição mensal é muito dispersa
- `A30`: amostra n
- `A31`: média
- `F31`: Média mensal de aulas dadas
- `A32`: mediana
- `A33`: moda
- `F33`: média mensal de aulas dadas (com IC 95%)
- `A34`: desvio s
- `A35`: mínimo
- `A36`: máximo
- `F36`: Dia cheio e dia vazio típicos
- `A37`: Q1 (25%)
- `A38`: Q3 (75%)

#### Aba: `Benefícios Personal`

- Fórmulas: **16**
- Inputs numéricos: **24**
- Labels/Cabeçalhos: **27**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `B1`: Diamante
- `C1`: Ouro
- `D1`: Prata 
- `E1`: Bronze
- `A2`: Meta aulas dadas/mês
- `A3`: R$ Hora
- `H3`: Planos e faturamento mensal 
- `A4`: Internet
- `A5`: Bebodouro Água
- `H5`: Bronze
- `A6`: Banheiro
- `H6`: Prata
- `A7`: Banho
- `H7`: Ouro
- `A8`: Acesso Facial 
- `H8`: Diamante
- `A9`: Autonomia de imagem (sem uniformes obrigat.)
- `A11`: Hora para Treino Pessoal
- `A12`: Sala para Refeição

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `K5` | `=I5*J5` |  |
| `M5` | `=K5*L5` |  |
| `O5` | `=M5*N5` |  |
| `Q5` | `=P5*O5` |  |
| `K6` | `=I6*J6` |  |
| `M6` | `=K6*L6` |  |
| `O6` | `=M6*N6` |  |
| `Q6` | `=O6*P6` |  |
| `K7` | `=I7*J7` |  |
| `M7` | `=K7*L7` |  |
| `O7` | `=M7*N7` |  |
| `Q7` | `=O7*P7` |  |
| `K8` | `=I8*J8` |  |
| `M8` | `=K8*L8` |  |
| `O8` | `=M8*N8` |  |

#### Aba: `Benefícios aluno`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **4**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `A2`: Academia exclusiva
- `A4`: Sala de espera
- `A6`: Zero mensalidade

#### Aba: `Manifesto`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **0**
- Referências externas: **0**

#### Aba: `Concorrentes`

- Fórmulas: **12**
- Inputs numéricos: **33**
- Labels/Cabeçalhos: **22**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D2`: Academia Leven
- `I3`: R$ Pers.
- `A10`: Comparativo academias
- `A11`: Academia
- `D11`: Taxa p/ professor
- `F11`: Uniforme (cal/cam)
- `H11`: ~ mensalidade p/ aluno
- `K11`: Benefícios para o professor
- `A12`: Bodytech (Eldorado/Leopoldo)
- `A13`: Bodytech (Iguatemi)
- `A14`: Bodytech (JK)
- `A15`: Skyfit
- `A16`: Nation CT
- `A17`: Smartfit
- `A18`: Bio ritmo
- `A19`: Six Sport Life
- `A20`: Sett
- `A21`: Nossa academia
- `D21`: R$ 40 - R$ 60/aula
- `F21`: 0

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F4` | `=D4/E4` |  |
| `J4` | `=G4*I4` |  |
| `M4` | `=H4-L4` |  |
| `N4` | `=M4*G4` |  |
| `F5` | `=D5/E5` |  |
| `J5` | `=G5*I5` |  |
| `M5` | `=H5-L5` |  |
| `N5` | `=M5*G5` |  |
| `F6` | `=D6/E6` |  |
| `J6` | `=G6*I6` |  |
| `M6` | `=H6-L6` |  |
| `N6` | `=M6*G6` |  |

#### Aba: `Local`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **2**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Ambientes da academia (250m²)
- `A11`: Possíveis localizações 

#### Aba: `Sistema`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **0**
- Referências externas: **0**

---

### `Orçamento 16.0 - Oitava unidade (Alav.).xlsx`

**Abas (17):** `Orçamento`, `Custo investimento `, `Financiamento`, `Água e luz`, `Cálcul. trabalhado`, `Cálculo kit higiene`, `Equipe`, `Orçamento máquinas`, `Cronograma de ativ.`, `Cálcul. para definição benefic`, `Fórmulas fee para split`, `Benefícios Personal`, `Benefícios aluno`, `Manifesto`, `Concorrentes`, `Local`, `Sistema`

#### Aba: `Orçamento`

- Fórmulas: **3678**
- Inputs numéricos: **1826**
- Labels/Cabeçalhos: **198**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Item
- `B1`: Receita
- `C1`: 2031-01-01 00:00:00
- `D1`: 2031-02-01 00:00:00
- `E1`: 2031-03-01 00:00:00
- `F1`: 2031-04-01 00:00:00
- `G1`: 2031-05-01 00:00:00
- `H1`: 2031-06-01 00:00:00
- `I1`: 2031-07-01 00:00:00
- `J1`: 2031-08-01 00:00:00
- `K1`: 2031-09-01 00:00:00
- `L1`: 2031-10-01 00:00:00
- `M1`: 2031-11-01 00:00:00
- `N1`: 2031-12-01 00:00:00
- `T1`: Total Acumulado Ano 1
- `U1`: 2032-01-01 00:00:00
- `V1`: 2032-02-01 00:00:00
- `W1`: 2032-03-01 00:00:00
- `X1`: 2032-04-01 00:00:00
- `Y1`: 2032-05-01 00:00:00

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F2` | `=('Cálcul. trabalhado'!I3)/2` |  |
| `G2` | `=F2*2` |  |
| `H2` | `='Cálcul. trabalhado'!I4` |  |
| `I2` | `=H2` |  |
| `J2` | `=I2` |  |
| `K2` | `=J2` |  |
| `L2` | `=K2` |  |
| `M2` | `=L2` |  |
| `N2` | `=M2` |  |
| `T2` | `=SUM(F2:S2)` |  |
| `U2` | `='Cálcul. trabalhado'!I5` |  |
| `V2` | `=U2` |  |
| `W2` | `=V2` |  |
| `X2` | `=W2` |  |
| `Y2` | `=X2` |  |

#### Aba: `Custo investimento `

- Fórmulas: **20**
- Inputs numéricos: **7**
- Labels/Cabeçalhos: **9**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Investimento - Unidade 8
- `A7`: Total
- `B9`: Origem do custo financeiro
- `B26`: Prazo médio de pagamentos (6 anos)
- `C26`: Meses
- `B27`: Custo financeiro mensal (simulado)
- `B28`: Custo financeiro total do período
- `B30`: Resultado líquido projetado da unidade
- `B31`: Resultado após custo do capital

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=Financiamento!C7+Financiamento!C8` |  |
| `D3` | `=Financiamento!C10` |  |
| `J3` | `=J2*J4` |  |
| `J4` | `=AVERAGE(Orçamento!C10:N10)` |  |
| `D6` | `=J3+J9` |  |
| `D7` | `=SUM(D2:E6)` |  |
| `J9` | `=-(J8*J10)` |  |
| `J10` | `=AVERAGE(Orçamento!F5:N5)` |  |
| `D11` | `=D2` |  |
| `D14` | `=D3+D4+D5` |  |
| `D17` | `=D6` |  |
| `D18` | `=2.2%` |  |
| `D20` | `=D11/$D$7` |  |
| `D21` | `=D14/$D$7` |  |
| `D22` | `=D17/$D$7` |  |

#### Aba: `Financiamento`

- Fórmulas: **45**
- Inputs numéricos: **28**
- Labels/Cabeçalhos: **7**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D22`: Máquinas
- `E22`: Pesos livres
- `F22`: Imóvel
- `G22`: Arquit. 
- `H22`: Branding
- `B29`: R$ Parcela
- `B30`: Total Parcelamento

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `E2` | `=C2*D2` |  |
| `F2` | `=F29` |  |
| `G2` | `=E2*30%` |  |
| `H2` | `=E2-G2` |  |
| `E3` | `=D3*C2` |  |
| `B5` | `=SUM(B6:B9)` |  |
| `D6` | `=C6*B6` |  |
| `F6` | `=E6*D6` |  |
| `G6` | `=D6-F6` |  |
| `C7` | `='Orçamento máquinas'!W40` |  |
| `D7` | `=C7*B7` |  |
| `F7` | `=E7*D7` |  |
| `G7` | `=D7-F7` |  |
| `H7` | `=D29` |  |
| `D8` | `=C8*B8` |  |

#### Aba: `Água e luz`

- Fórmulas: **66**
- Inputs numéricos: **17**
- Labels/Cabeçalhos: **18**
- Referências externas: **12**

**Principais labels/cabeçalhos detectados:**

- `A1`: Energia
- `B1`: Valor
- `F1`: Síntese
- `F2`: Ano
- `G2`: Ocupação
- `H2`: Energia
- `I2`: Água
- `J2`: Total
- `A6`: Ocupação
- `B6`: Parcela fixa
- `C6`: Parcela variável
- `D6`: Energia total
- `A14`: Água
- `B14`: Valor
- `A18`: Ocupação
- `B18`: Parcela fixa
- `C18`: Parcela variável
- `D18`: Água total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D7` |  |
| `I3` | `=D19` |  |
| `J3` | `=H3+I3` |  |
| `H4` | `=D8` |  |
| `I4` | `=D20` |  |
| `J4` | `=H4+I4` |  |
| `H5` | `=D9` |  |
| `I5` | `=D21` |  |
| `J5` | `=H5+I5` |  |
| `H6` | `=D10` |  |
| `I6` | `=D22` |  |
| `J6` | `=H6+I6` |  |
| `A7` | `='[1]Cálcul. trabalhado'!H4` | ✓ |
| `B7` | `=B2` |  |
| `C7` | `=B3*A7` |  |

**⚠️ Referências Externas detectadas:**

- `A7`: refs `['[1]']`
- `A8`: refs `['[1]']`
- `A9`: refs `['[1]']`
- `A10`: refs `['[1]']`
- `A11`: refs `['[1]']`
- `A12`: refs `['[1]']`
- `A19`: refs `['[1]']`
- `A20`: refs `['[1]']`
- `A21`: refs `['[1]']`
- `A22`: refs `['[1]']`

#### Aba: `Cálcul. trabalhado`

- Fórmulas: **72**
- Inputs numéricos: **73**
- Labels/Cabeçalhos: **39**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `F1`: Aluno por Hora
- `G1`: 10
- `H1`: Tx de Ocupação (% Hs)
- `I1`: Res. Mensal
- `F2`: Meta
- `A3`: 2026
- `B3`: Semana
- `D3`: Sábado
- `F3`: Meta
- `F4`: Meta
- `F5`: Meta
- `F6`: Meta
- `F7`: Meta
- `F8`: Meta
- `F9`: Meta
- `U10`: 6
- `S15`: Cenários dos anos e médias (info. GPT)
- `A16`: 2027
- `B16`: Semana
- `D16`: Sábado

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `B1` | `=#REF!` |  |
| `C1` | `=_xlfn.DAYS(B2,B1)` |  |
| `I2` | `=(($B$14+$D$14)*H2)` |  |
| `I3` | `=((B13+D13)*H3)` |  |
| `I4` | `=((B26+D26)*H4)` |  |
| `I5` | `=(B40+D40)*H5` |  |
| `I6` | `=(B40+D40)*H6` |  |
| `B7` | `=U9` |  |
| `D7` | `=U10` |  |
| `I7` | `=(B40+D40)*H7` |  |
| `B8` | `=$B$6*B7` |  |
| `D8` | `=D6*D7` |  |
| `I8` | `=(B40+D40)*H8` |  |
| `B9` | `=K20` |  |
| `D9` | `=K20` |  |

#### Aba: `Cálculo kit higiene`

- Fórmulas: **76**
- Inputs numéricos: **18**
- Labels/Cabeçalhos: **19**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Parâmetros
- `C1`: valores
- `E4`: Horas sábado func.
- `F4`: Horas domingo func.
- `G4`: Horas dias úteis func.
- `H4`: Dias úteis
- `E7`: Média de aulas dadas por dia/professor (dias vazios e cheios)
- `H7`: arredondando
- `A20`: Cálculos
- `A27`: Ano
- `B27`: Ocupação
- `D27`: Banhos profs./mês
- `E27`: Banhos totais/mês
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `H27`: Qtd.Reposições
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C2` | `=H8` |  |
| `C5` | `=H5*G5` |  |
| `C6` | `=E5+F5` |  |
| `C7` | `=C3*C5` |  |
| `C8` | `=C6*C3` |  |
| `E8` | `=('Cálcul. para definição benefic'!D31+'Cálcul. para definição benefic'!C31)/2` |  |
| `H8` | `=ROUNDDOWN(E8,1)` |  |
| `C9` | `=C7+C8` |  |
| `C10` | `=C9/C2` |  |
| `C11` | `=C10*4` |  |
| `C22` | `=C11` |  |
| `C23` | `=C21+C22` |  |
| `C24` | `=C12` |  |
| `C25` | `=C13` |  |
| `B28` | `='Cálcul. trabalhado'!H3` |  |

#### Aba: `Equipe`

- Fórmulas: **145**
- Inputs numéricos: **87**
- Labels/Cabeçalhos: **54**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: 2029
- `B2`: Equipe de 6 horas
- `D2`: Salário
- `E2`: Produtividade
- `F2`: R$ Produtiv.
- `G2`: Encargos + Benefícios
- `H2`: R$ Encargos
- `I2`: R$ Salário + Encargos + Produt.
- `J2`: Total
- `A12`: 2030
- `B12`: Equipe de 6 horas
- `D12`: Salário
- `E12`: Produtividade
- `F12`: R$ Produtiv.
- `G12`: Encargos + Benefícios
- `H12`: R$ Encargos
- `I12`: R$ Salário + Encargos + Produt.
- `J12`: Total
- `A22`: 2031
- `B22`: Equipe de 6 horas

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `H3` | `=D3*G3` |  |
| `I3` | `=D3+H3` |  |
| `J3` | `=I3*C3` |  |
| `H4` | `=D4*G4` |  |
| `I4` | `=D4+H4+E4` |  |
| `J4` | `=I4*C4` |  |
| `F5` | `=E5*'Cálcul. trabalhado'!I3` |  |
| `H5` | `=(D5+F5)*G5` |  |
| `I5` | `=D5+H5+F5` |  |
| `J5` | `=I5*C5` |  |
| `H6` | `=D6*G6` |  |
| `I6` | `=D6+H6` |  |
| `J6` | `=I6*C6` |  |
| `H7` | `=D7*G7` |  |
| `I7` | `=D7+H7` |  |

#### Aba: `Orçamento máquinas`

- Fórmulas: **16**
- Inputs numéricos: **104**
- Labels/Cabeçalhos: **20**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A2`: Equipamentos
- `D2`: TechnoGym
- `G2`: Lifefitness
- `J2`: Cimerian
- `M2`: Total Health
- `P2`: Buckler
- `R2`: Matrix
- `T2`: Fokus
- `A20`: Pesos livres
- `D20`: Poundfit
- `G20`: HubGym
- `J20`: Rotha
- `M20`: BRW Group
- `O20`: Bucker
- `A28`: Acessórios
- `D28`: Estimativa (aprox)
- `G28`: BRW Group
- `T36`: Valor total mínimo ~
- `T38`: Tech+Life+Matrix
- `T40`: total

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D16` | `=D3+D4+D5+D6+D7+D9+D10+D11+D12` |  |
| `G16` | `=G3+G5+G6+G7+G9+G10+G11+G12+G4+G13+G14+G15` |  |
| `J16` | `=J3+J4+J5+J6+J7+J9+J10+J11+J12` |  |
| `M16` | `=M3+M4+M5+M6+M7+M9+M11+M12` |  |
| `P16` | `=P3+P4+P5+P6+P7+P9+P10+P11+P12+P14+T4+P15` |  |
| `R16` | `=R13+R14+R15` |  |
| `D26` | `=D21+D22+D23+D24` |  |
| `G26` | `=G21+G22+G23+G24` |  |
| `J26` | `=J21+J22+J23+J24+J25` |  |
| `M26` | `=M21+M22+M23+M24` |  |
| `O26` | `=O21+O22+O23+O24+O25` |  |
| `W36` | `=J16+J26+D46` |  |
| `W38` | `=G3+G4+G5+G6+G7+G9+T8+D11+D12+R13+R14+R15` |  |
| `W40` | `=W38+D46` |  |
| `D46` | `=D29+D30+D31+D32+D33+D34+D35+D36+D37+D38+D39+D40+D41+D42+D43+D44+D45` |  |

#### Aba: `Cronograma de ativ.`

- Fórmulas: **104**
- Inputs numéricos: **32**
- Labels/Cabeçalhos: **39**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `B1`: Inicio
- `C1`: Prazo (dias)
- `D1`: Término
- `E1`: Offset
- `A2`: Fase S (sistema)
- `B13`: Início
- `C13`: Prazo (dias)
- `D13`: Término
- `E13`: Offset
- `A14`: Fase I (Imóvel)
- `B21`: Início
- `C21`: Prazo (dias)
- `D21`: Término
- `E21`: Offset
- `A22`: Fase II (Contábil e legal)
- `C22`: 10
- `B29`: Início
- `C29`: Prazo (dias)
- `D29`: Término
- `E29`: Offset

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=D10` |  |
| `D3` | `=B3+C3` |  |
| `E3` | `=B3-DATE(2025,10,1)` |  |
| `D4` | `=B4+C4` |  |
| `E4` | `=B4-DATE(2025,10,1)` |  |
| `B5` | `=D4` |  |
| `D5` | `=B5+C5` |  |
| `E5` | `=B5-DATE(2025,10,1)` |  |
| `B6` | `=D5` |  |
| `D6` | `=B6+C6` |  |
| `E6` | `=B6-DATE(2025,10,1)` |  |
| `B7` | `=D6` |  |
| `D7` | `=B7+C7` |  |
| `E7` | `=B7-DATE(2025,10,1)` |  |
| `B8` | `=D7` |  |

#### Aba: `Cálcul. para definição benefic`

- Fórmulas: **0**
- Inputs numéricos: **27**
- Labels/Cabeçalhos: **30**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A28`: Estastística descritiva
- `F28`: Interpretção dos dados
- `P28`: Critérios para definição da faixa ideal de aulas/mês por plano
- `A29`: indicador
- `B29`: aulas/mês
- `C29`: Dia cheio
- `D29`: Dia vazio
- `F29`: Distribuição mensal é muito dispersa
- `A30`: amostra n
- `A31`: média
- `F31`: Média mensal de aulas dadas
- `A32`: mediana
- `A33`: moda
- `F33`: média mensal de aulas dadas (com IC 95%)
- `A34`: desvio s
- `A35`: mínimo
- `A36`: máximo
- `F36`: Dia cheio e dia vazio típicos
- `A37`: Q1 (25%)
- `A38`: Q3 (75%)

#### Aba: `Fórmulas fee para split`

- Fórmulas: **4**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **2**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Variáveis do sistema
- `B1`: Definições

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C3` | `=IF(C4>=110,50,IF(C4>=71,55,IF(C4>=41,60,IF(C4>=15,65,0))))` |  |
| `C5` | `=C6*(C2+C3)` |  |
| `C7` | `=C6*C3` |  |
| `C8` | `=C5-C7` |  |

#### Aba: `Benefícios Personal`

- Fórmulas: **16**
- Inputs numéricos: **24**
- Labels/Cabeçalhos: **27**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `B1`: Diamante
- `C1`: Ouro
- `D1`: Prata 
- `E1`: Bronze
- `A2`: Meta aulas dadas/mês
- `A3`: R$ Hora
- `H3`: Planos e faturamento mensal 
- `A4`: Internet
- `A5`: Bebodouro Água
- `H5`: Bronze
- `A6`: Banheiro
- `H6`: Prata
- `A7`: Banho
- `H7`: Ouro
- `A8`: Acesso Facial 
- `H8`: Diamante
- `A9`: Autonomia de imagem (sem uniformes obrigat.)
- `A11`: Hora para Treino Pessoal
- `A12`: Sala para Refeição

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `K5` | `=I5*J5` |  |
| `M5` | `=K5*L5` |  |
| `O5` | `=M5*N5` |  |
| `Q5` | `=P5*O5` |  |
| `K6` | `=I6*J6` |  |
| `M6` | `=K6*L6` |  |
| `O6` | `=M6*N6` |  |
| `Q6` | `=O6*P6` |  |
| `K7` | `=I7*J7` |  |
| `M7` | `=K7*L7` |  |
| `O7` | `=M7*N7` |  |
| `Q7` | `=O7*P7` |  |
| `K8` | `=I8*J8` |  |
| `M8` | `=K8*L8` |  |
| `O8` | `=M8*N8` |  |

#### Aba: `Benefícios aluno`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **4**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Benefícios
- `A2`: Academia exclusiva
- `A4`: Sala de espera
- `A6`: Zero mensalidade

#### Aba: `Manifesto`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **0**
- Referências externas: **0**

#### Aba: `Concorrentes`

- Fórmulas: **12**
- Inputs numéricos: **33**
- Labels/Cabeçalhos: **22**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `D2`: Academia Leven
- `I3`: R$ Pers.
- `A10`: Comparativo academias
- `A11`: Academia
- `D11`: Taxa p/ professor
- `F11`: Uniforme (cal/cam)
- `H11`: ~ mensalidade p/ aluno
- `K11`: Benefícios para o professor
- `A12`: Bodytech (Eldorado/Leopoldo)
- `A13`: Bodytech (Iguatemi)
- `A14`: Bodytech (JK)
- `A15`: Skyfit
- `A16`: Nation CT
- `A17`: Smartfit
- `A18`: Bio ritmo
- `A19`: Six Sport Life
- `A20`: Sett
- `A21`: Nossa academia
- `D21`: R$ 40 - R$ 60/aula
- `F21`: 0

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `F4` | `=D4/E4` |  |
| `J4` | `=G4*I4` |  |
| `M4` | `=H4-L4` |  |
| `N4` | `=M4*G4` |  |
| `F5` | `=D5/E5` |  |
| `J5` | `=G5*I5` |  |
| `M5` | `=H5-L5` |  |
| `N5` | `=M5*G5` |  |
| `F6` | `=D6/E6` |  |
| `J6` | `=G6*I6` |  |
| `M6` | `=H6-L6` |  |
| `N6` | `=M6*G6` |  |

#### Aba: `Local`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **2**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Ambientes da academia (250m²)
- `A11`: Possíveis localizações 

#### Aba: `Sistema`

- Fórmulas: **0**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **0**
- Referências externas: **0**

---

### `Consolidado - 2027-2034 Alav. (oito unidades).xlsx`

**Abas (2):** `Resultado consolidado`, `Capex Total `

#### Aba: `Resultado consolidado`

- Fórmulas: **466**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **115**
- Referências externas: **210**

**Principais labels/cabeçalhos detectados:**

- `A1`: Item
- `B1`: Descrição
- `C1`: 2026-08-01 00:00:00
- `D1`: 2026-09-01 00:00:00
- `E1`: 2026-10-01 00:00:00
- `F1`: 2026-11-01 00:00:00
- `G1`: 2026-12-01 00:00:00
- `H1`: 2027-01-01 00:00:00
- `I1`: 2027-02-01 00:00:00
- `J1`: 2027-03-01 00:00:00
- `K1`: 2027-04-01 00:00:00
- `L1`: 2027-05-01 00:00:00
- `M1`: 2027-06-01 00:00:00
- `N1`: 2027-07-01 00:00:00
- `O1`: 2027-08-01 00:00:00
- `P1`: 2027-09-01 00:00:00
- `Q1`: 2027-10-01 00:00:00
- `R1`: 2027-11-01 00:00:00
- `S1`: 2027-12-01 00:00:00
- `T1`: Total Acumulado Ano 1

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C2` | `=IFERROR(INDEX([1]Orçamento!$C$2:$ZZ$2,1,MATCH(C$1,[1]Orçamento!$C$1:$ZZ$1,0)),0` | ✓ |
| `D2` | `=IFERROR(INDEX([1]Orçamento!$C$2:$ZZ$2,1,MATCH(D$1,[1]Orçamento!$C$1:$ZZ$1,0)),0` | ✓ |
| `E2` | `=IFERROR(INDEX([1]Orçamento!$C$2:$ZZ$2,1,MATCH(E$1,[1]Orçamento!$C$1:$ZZ$1,0)),0` | ✓ |
| `F2` | `=IFERROR(INDEX([1]Orçamento!$C$2:$ZZ$2,1,MATCH(F$1,[1]Orçamento!$C$1:$ZZ$1,0)),0` | ✓ |
| `G2` | `=IFERROR(INDEX([1]Orçamento!$C$2:$ZZ$2,1,MATCH(G$1,[1]Orçamento!$C$1:$ZZ$1,0)),0` | ✓ |
| `H2` | `=IFERROR(INDEX([1]Orçamento!$C$2:$ZZ$2,1,MATCH(H$1,[1]Orçamento!$C$1:$ZZ$1,0)),0` | ✓ |
| `I2` | `=IFERROR(INDEX([1]Orçamento!$C$2:$ZZ$2,1,MATCH(I$1,[1]Orçamento!$C$1:$ZZ$1,0)),0` | ✓ |
| `J2` | `=IFERROR(INDEX([1]Orçamento!$C$2:$ZZ$2,1,MATCH(J$1,[1]Orçamento!$C$1:$ZZ$1,0)),0` | ✓ |
| `K2` | `=IFERROR(INDEX([1]Orçamento!$C$2:$ZZ$2,1,MATCH(K$1,[1]Orçamento!$C$1:$ZZ$1,0)),0` | ✓ |
| `L2` | `=IFERROR(INDEX([1]Orçamento!$C$2:$ZZ$2,1,MATCH(L$1,[1]Orçamento!$C$1:$ZZ$1,0)),0` | ✓ |
| `M2` | `=IFERROR(INDEX([1]Orçamento!$C$2:$ZZ$2,1,MATCH(M$1,[1]Orçamento!$C$1:$ZZ$1,0)),0` | ✓ |
| `N2` | `=IFERROR(INDEX([1]Orçamento!$C$2:$ZZ$2,1,MATCH(N$1,[1]Orçamento!$C$1:$ZZ$1,0)),0` | ✓ |
| `O2` | `=IFERROR(INDEX([1]Orçamento!$C$2:$ZZ$2,1,MATCH(O$1,[1]Orçamento!$C$1:$ZZ$1,0)),0` | ✓ |
| `P2` | `=IFERROR(INDEX([1]Orçamento!$C$2:$ZZ$2,1,MATCH(P$1,[1]Orçamento!$C$1:$ZZ$1,0)),0` | ✓ |
| `Q2` | `=IFERROR(INDEX([1]Orçamento!$C$2:$ZZ$2,1,MATCH(Q$1,[1]Orçamento!$C$1:$ZZ$1,0)),0` | ✓ |

**⚠️ Referências Externas detectadas:**

- `C2`: refs `['[1]', '[1]', '[2]']`
- `D2`: refs `['[1]', '[1]', '[2]']`
- `E2`: refs `['[1]', '[1]', '[2]']`
- `F2`: refs `['[1]', '[1]', '[2]']`
- `G2`: refs `['[1]', '[1]', '[2]']`
- `H2`: refs `['[1]', '[1]', '[2]']`
- `I2`: refs `['[1]', '[1]', '[2]']`
- `J2`: refs `['[1]', '[1]', '[2]']`
- `K2`: refs `['[1]', '[1]', '[2]']`
- `L2`: refs `['[1]', '[1]', '[2]']`

#### Aba: `Capex Total `

- Fórmulas: **14**
- Inputs numéricos: **9**
- Labels/Cabeçalhos: **6**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Unidade
- `B1`: Meses de dívida até 2034
- `C1`: Custo mensal
- `D1`: Custo de capital até 2034
- `A10`: Resultado líquido projetado consolidado
- `A11`: Resultado após custo de capital

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `D2` | `=B2*C2` |  |
| `D3` | `=B3*C3` |  |
| `C4` | `=C3` |  |
| `D4` | `=B4*C4` |  |
| `C5` | `=C3` |  |
| `D5` | `=B5*C5` |  |
| `C6` | `=C4` |  |
| `D6` | `=B6*C6` |  |
| `C7` | `=C5` |  |
| `D7` | `=B7*C7` |  |
| `C8` | `=C6` |  |
| `D8` | `=B8*C8` |  |
| `B10` | `='Resultado consolidado'!DG5` |  |
| `B11` | `=B10-SUM(D2:D8)` |  |

---

### `Dashboard base.xlsx`

**Abas (4):** `Unidades`, `Base financeira`, `Unit economics anual`, `Unit economics (fixos)`

#### Aba: `Unidades`

- Fórmulas: **0**
- Inputs numéricos: **8**
- Labels/Cabeçalhos: **3**
- Referências externas: **0**

**Principais labels/cabeçalhos detectados:**

- `A1`: Unidade
- `B1`: Tipo
- `C1`: Ano abertura

#### Aba: `Base financeira`

- Fórmulas: **383**
- Inputs numéricos: **107**
- Labels/Cabeçalhos: **11**
- Referências externas: **206**

**Principais labels/cabeçalhos detectados:**

- `A1`: Unidade
- `B1`: Ano
- `C1`: Receita
- `D1`: Custos fixos
- `E1`: Custos variáveis
- `F1`: Resultado operacional
- `G1`: Custos financeiros
- `H1`: Lucro líquido
- `I1`: Margem líquida
- `J1`: Ocupação projetada
- `K1`: Professores necessários (cenário médio)

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C2` | `=SUM([1]Orçamento!$F$2:$G$2)` | ✓ |
| `D2` | `=SUM([1]Orçamento!$C$10:$G$10)-SUM([1]Orçamento!$C$51:$G$51)` | ✓ |
| `E2` | `=C2*'[1]Ocupação e unit economics 2.0'!$K$5` | ✓ |
| `F2` | `=C2-D2-E2` |  |
| `H2` | `=F2-G2` |  |
| `I2` | `=H2/C2` |  |
| `K2` | `=ROUNDUP(('[1]Ocupação e unit economics 2.0'!$B$33*0.03)/'[1]Ocupação e unit eco` | ✓ |
| `C3` | `=SUM([1]Orçamento!$H$2:$S$2)` | ✓ |
| `D3` | `=SUM([1]Orçamento!$H$10:$S$10)-SUM([1]Orçamento!$H$51:$S$51)` | ✓ |
| `E3` | `=C3*'[1]Ocupação e unit economics 2.0'!$K$5` | ✓ |
| `F3` | `=C3-D3-E3` |  |
| `H3` | `=F3-G3` |  |
| `I3` | `=H3/C3` |  |
| `K3` | `='[1]Ocupação e unit economics 2.0'!$B$102` | ✓ |
| `C4` | `=SUM([1]Orçamento!$U$2:$AF$2)` | ✓ |

**⚠️ Referências Externas detectadas:**

- `C2`: refs `['[1]']`
- `D2`: refs `['[1]', '[1]']`
- `E2`: refs `['[1]']`
- `K2`: refs `['[1]', '[1]']`
- `C3`: refs `['[1]']`
- `D3`: refs `['[1]', '[1]']`
- `E3`: refs `['[1]']`
- `K3`: refs `['[1]']`
- `C4`: refs `['[1]']`
- `D4`: refs `['[1]', '[1]']`

#### Aba: `Unit economics anual`

- Fórmulas: **40**
- Inputs numéricos: **40**
- Labels/Cabeçalhos: **3**
- Referências externas: **40**

**Principais labels/cabeçalhos detectados:**

- `A1`: Ano
- `B1`: Métrica
- `C1`: Valor

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `C2` | `='[1]Ocupação e unit economics 2.0'!$B$70` | ✓ |
| `C3` | `='[1]Ocupação e unit economics 2.0'!$C$70` | ✓ |
| `C4` | `='[1]Ocupação e unit economics 2.0'!$D$70` | ✓ |
| `C5` | `='[1]Ocupação e unit economics 2.0'!$E$70` | ✓ |
| `C6` | `='[1]Ocupação e unit economics 2.0'!$F$70` | ✓ |
| `C7` | `='[1]Ocupação e unit economics 2.0'!$G$70` | ✓ |
| `C8` | `='[1]Ocupação e unit economics 2.0'!$G$70` | ✓ |
| `C9` | `='[1]Ocupação e unit economics 2.0'!$H$70` | ✓ |
| `C10` | `='[1]Ocupação e unit economics 2.0'!$B$71` | ✓ |
| `C11` | `='[1]Ocupação e unit economics 2.0'!$C$71` | ✓ |
| `C12` | `='[1]Ocupação e unit economics 2.0'!$D$71` | ✓ |
| `C13` | `='[1]Ocupação e unit economics 2.0'!$E$71` | ✓ |
| `C14` | `='[1]Ocupação e unit economics 2.0'!$F$71` | ✓ |
| `C15` | `='[1]Ocupação e unit economics 2.0'!$G$71` | ✓ |
| `C16` | `='[1]Ocupação e unit economics 2.0'!$G$71` | ✓ |

**⚠️ Referências Externas detectadas:**

- `C2`: refs `['[1]']`
- `C3`: refs `['[1]']`
- `C4`: refs `['[1]']`
- `C5`: refs `['[1]']`
- `C6`: refs `['[1]']`
- `C7`: refs `['[1]']`
- `C8`: refs `['[1]']`
- `C9`: refs `['[1]']`
- `C10`: refs `['[1]']`
- `C11`: refs `['[1]']`

#### Aba: `Unit economics (fixos)`

- Fórmulas: **6**
- Inputs numéricos: **0**
- Labels/Cabeçalhos: **2**
- Referências externas: **4**

**Principais labels/cabeçalhos detectados:**

- `A1`: Métricas
- `B1`: Valores

**Amostra de fórmulas relevantes (primeiros 15):**

| Célula | Fórmula | Ref. Externa |
|---|---|---|
| `B2` | `='[1]Ocupação e unit economics 2.0'!$B$33` | ✓ |
| `B3` | `='[1]Ocupação e unit economics 2.0'!$B$63` | ✓ |
| `B4` | `=B2*B3` |  |
| `B5` | `=12*B4` |  |
| `B6` | `='[1]Ocupação e unit economics 2.0'!$B$85` | ✓ |
| `B7` | `='[1]Ocupação e unit economics 2.0'!$B$81` | ✓ |

**⚠️ Referências Externas detectadas:**

- `B2`: refs `['[1]']`
- `B3`: refs `['[1]']`
- `B6`: refs `['[1]']`
- `B7`: refs `['[1]']`

---

## 3. Referências Externas (Cross-File)

| Arquivo | Aba | Célula | Referências |
|---|---|---|---|
| `Orçamento 16.0 - Unidade Laboratório (Al` | `Cálcul. trabalhado` | `B1` | `[1]` |
| `Orçamento 16.0 - Segunda unidade (Alav.)` | `Água e luz` | `A7` | `[1]` |
| `Orçamento 16.0 - Segunda unidade (Alav.)` | `Água e luz` | `A8` | `[1]` |
| `Orçamento 16.0 - Segunda unidade (Alav.)` | `Água e luz` | `A9` | `[1]` |
| `Orçamento 16.0 - Segunda unidade (Alav.)` | `Água e luz` | `A10` | `[1]` |
| `Orçamento 16.0 - Segunda unidade (Alav.)` | `Água e luz` | `A11` | `[1]` |
| `Orçamento 16.0 - Segunda unidade (Alav.)` | `Água e luz` | `A12` | `[1]` |
| `Orçamento 16.0 - Segunda unidade (Alav.)` | `Água e luz` | `A19` | `[1]` |
| `Orçamento 16.0 - Segunda unidade (Alav.)` | `Água e luz` | `A20` | `[1]` |
| `Orçamento 16.0 - Segunda unidade (Alav.)` | `Água e luz` | `A21` | `[1]` |
| `Orçamento 16.0 - Segunda unidade (Alav.)` | `Água e luz` | `A22` | `[1]` |
| `Orçamento 16.0 - Segunda unidade (Alav.)` | `Água e luz` | `A23` | `[1]` |
| `Orçamento 16.0 - Segunda unidade (Alav.)` | `Água e luz` | `A24` | `[1]` |
| `Orçamento 16.0 - Terceira unidade (Alav.` | `Água e luz` | `A7` | `[1]` |
| `Orçamento 16.0 - Terceira unidade (Alav.` | `Água e luz` | `A8` | `[1]` |
| `Orçamento 16.0 - Terceira unidade (Alav.` | `Água e luz` | `A9` | `[1]` |
| `Orçamento 16.0 - Terceira unidade (Alav.` | `Água e luz` | `A10` | `[1]` |
| `Orçamento 16.0 - Terceira unidade (Alav.` | `Água e luz` | `A11` | `[1]` |
| `Orçamento 16.0 - Terceira unidade (Alav.` | `Água e luz` | `A12` | `[1]` |
| `Orçamento 16.0 - Terceira unidade (Alav.` | `Água e luz` | `A19` | `[1]` |
| `Orçamento 16.0 - Terceira unidade (Alav.` | `Água e luz` | `A20` | `[1]` |
| `Orçamento 16.0 - Terceira unidade (Alav.` | `Água e luz` | `A21` | `[1]` |
| `Orçamento 16.0 - Terceira unidade (Alav.` | `Água e luz` | `A22` | `[1]` |
| `Orçamento 16.0 - Terceira unidade (Alav.` | `Água e luz` | `A23` | `[1]` |
| `Orçamento 16.0 - Terceira unidade (Alav.` | `Água e luz` | `A24` | `[1]` |
| `Orçamento 16.0 - Quarta unidade (Alav.).` | `Água e luz` | `A7` | `[1]` |
| `Orçamento 16.0 - Quarta unidade (Alav.).` | `Água e luz` | `A8` | `[1]` |
| `Orçamento 16.0 - Quarta unidade (Alav.).` | `Água e luz` | `A9` | `[1]` |
| `Orçamento 16.0 - Quarta unidade (Alav.).` | `Água e luz` | `A10` | `[1]` |
| `Orçamento 16.0 - Quarta unidade (Alav.).` | `Água e luz` | `A11` | `[1]` |
| `Orçamento 16.0 - Quarta unidade (Alav.).` | `Água e luz` | `A12` | `[1]` |
| `Orçamento 16.0 - Quarta unidade (Alav.).` | `Água e luz` | `A19` | `[1]` |
| `Orçamento 16.0 - Quarta unidade (Alav.).` | `Água e luz` | `A20` | `[1]` |
| `Orçamento 16.0 - Quarta unidade (Alav.).` | `Água e luz` | `A21` | `[1]` |
| `Orçamento 16.0 - Quarta unidade (Alav.).` | `Água e luz` | `A22` | `[1]` |
| `Orçamento 16.0 - Quarta unidade (Alav.).` | `Água e luz` | `A23` | `[1]` |
| `Orçamento 16.0 - Quarta unidade (Alav.).` | `Água e luz` | `A24` | `[1]` |
| `Orçamento 16.0 - Quinta unidade (Alav.).` | `Água e luz` | `A7` | `[1]` |
| `Orçamento 16.0 - Quinta unidade (Alav.).` | `Água e luz` | `A8` | `[1]` |
| `Orçamento 16.0 - Quinta unidade (Alav.).` | `Água e luz` | `A9` | `[1]` |
| `Orçamento 16.0 - Quinta unidade (Alav.).` | `Água e luz` | `A10` | `[1]` |
| `Orçamento 16.0 - Quinta unidade (Alav.).` | `Água e luz` | `A11` | `[1]` |
| `Orçamento 16.0 - Quinta unidade (Alav.).` | `Água e luz` | `A12` | `[1]` |
| `Orçamento 16.0 - Quinta unidade (Alav.).` | `Água e luz` | `A19` | `[1]` |
| `Orçamento 16.0 - Quinta unidade (Alav.).` | `Água e luz` | `A20` | `[1]` |
| `Orçamento 16.0 - Quinta unidade (Alav.).` | `Água e luz` | `A21` | `[1]` |
| `Orçamento 16.0 - Quinta unidade (Alav.).` | `Água e luz` | `A22` | `[1]` |
| `Orçamento 16.0 - Quinta unidade (Alav.).` | `Água e luz` | `A23` | `[1]` |
| `Orçamento 16.0 - Quinta unidade (Alav.).` | `Água e luz` | `A24` | `[1]` |
| `Orçamento 16.0 - Sexta unidade (Alav.).x` | `Água e luz` | `A7` | `[1]` |

---

## 4. Mapa de Inputs vs. Outputs

### Convenção adotada para classificação

| Tipo | Critério de identificação |
|---|---|
| **Input manual** | Célula com valor numérico sem fórmula |
| **Output / resultado** | Célula com fórmula (`=SUM`, `=IF`, etc.) |
| **Label** | Célula com texto em negrito |

> **Nota:** A classificação é heurística. Recomenda-se revisão manual dos inputs críticos identificados abaixo.

### Inputs e outputs de alta relevância por arquivo

#### `Orçamento 16.0 - Unidade Laboratório (Alav.).xlsx`
**Aba `Orçamento` — Labels financeiros relevantes:**
- `B1`: Receita
- `T1`: Total Acumulado Ano 1
- `AG1`: Total Acumulado Ano 2
- `AT1`: Total Acumulado Ano 3
- `BG1`: Total Acumulado Ano 4
- `BT1`: Total Acumulado Ano 5
- `CG1`: Total Acumulado Ano 6
- `CT1`: Total Acumulado Ano 7
- `DG1`: Total Acumulado Ano 8
- `B5`: Resultado
- `B8`: Total Fixo + Variável
- `B10`: Custos Fixos
- `B25`: Despesas
- `B50`: Outros custos fixos
- `B53`: Custos Variáveis

**Aba `Custo investimento Lab` — Labels financeiros relevantes:**
- `A8`: Total

**Aba `Financiamento` — Labels financeiros relevantes:**
- `B30`: Total Parcelamento

**Aba `Água e luz` — Labels financeiros relevantes:**
- `J2`: Total
- `D6`: Energia total
- `D18`: Água total

**Aba `Cálcul. trabalhado` — Labels financeiros relevantes:**
- `I1`: Res. Mensal
- `H28`: Meta Alunos

**Aba `Ocupação e unit economics 2.0` — Labels financeiros relevantes:**
- `A1`: Custos fixos mensais 
- `J1`: Custos variáveis mensais 
- `J5`: % total variável
- `A19`: Total custos fixos/mês
- `A89`: Professores para Breakeven

**Aba `Cálculo kit higiene` — Labels financeiros relevantes:**
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Aba `Equipe` — Labels financeiros relevantes:**
- `J2`: Total
- `J12`: Total
- `J22`: Total
- `J32`: Total
- `J42`: Total
- `J52`: Total
- `J62`: Total
- `J72`: Total

**Aba `Orçamento máquinas` — Labels financeiros relevantes:**
- `M2`: Total Health
- `T36`: Valor total mínimo ~
- `T40`: total

**Aba `Cálcul. para definição benefic` — Labels financeiros relevantes:**
- `F29`: Distribuição mensal é muito dispersa
- `F31`: Média mensal de aulas dadas
- `F33`: média mensal de aulas dadas (com IC 95%)

**Aba `Benefícios Personal` — Labels financeiros relevantes:**
- `H3`: Planos e faturamento mensal 

**Aba `Benefícios aluno` — Labels financeiros relevantes:**
- `A6`: Zero mensalidade

**Aba `Concorrentes` — Labels financeiros relevantes:**
- `H11`: ~ mensalidade p/ aluno

#### `Orçamento 16.0 - Segunda unidade (Alav.).xlsx`
**Aba `Orçamento` — Labels financeiros relevantes:**
- `B1`: Receita
- `T1`: Total Acumulado Ano 1
- `AG1`: Total Acumulado Ano 2
- `AT1`: Total Acumulado Ano 3
- `BG1`: Total Acumulado Ano 4
- `BT1`: Total Acumulado Ano 5
- `CG1`: Total Acumulado Ano 6
- `CT1`: Total acumulado Ano 7
- `CU1`: Total acumulado pós custo capital
- `B5`: Resultado
- `B8`: Total Fixo + Variável
- `B10`: Custos Fixos
- `B25`: Despesas
- `B50`: Outros custos fixos
- `B53`: Custos Variáveis

**Aba `Custo investimento ` — Labels financeiros relevantes:**
- `A1`: Investimento - Unidade 2
- `A7`: Total
- `B9`: Origem do custo financeiro
- `B27`: Custo financeiro mensal (simulado)
- `B28`: Custo financeiro total do período
- `B30`: Resultado líquido projetado da unidade
- `B31`: Resultado após custo do capital

**Aba `Financiamento` — Labels financeiros relevantes:**
- `B30`: Total Parcelamento

**Aba `Água e luz` — Labels financeiros relevantes:**
- `J2`: Total
- `D6`: Energia total
- `D18`: Água total

**Aba `Cálcul. trabalhado` — Labels financeiros relevantes:**
- `I1`: Res. Mensal
- `H19`: Meta Alunos

**Aba `Cálculo kit higiene` — Labels financeiros relevantes:**
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Aba `Equipe` — Labels financeiros relevantes:**
- `J2`: Total
- `J12`: Total
- `J22`: Total
- `J32`: Total
- `J42`: Total
- `J52`: Total

**Aba `Orçamento máquinas` — Labels financeiros relevantes:**
- `M2`: Total Health
- `T36`: Valor total mínimo ~
- `T40`: total

**Aba `Cálcul. para definição benefic` — Labels financeiros relevantes:**
- `F29`: Distribuição mensal é muito dispersa
- `F31`: Média mensal de aulas dadas
- `F33`: média mensal de aulas dadas (com IC 95%)

**Aba `Benefícios Personal` — Labels financeiros relevantes:**
- `H3`: Planos e faturamento mensal 

**Aba `Benefícios aluno` — Labels financeiros relevantes:**
- `A6`: Zero mensalidade

**Aba `Concorrentes` — Labels financeiros relevantes:**
- `H11`: ~ mensalidade p/ aluno

#### `Orçamento 16.0 - Terceira unidade (Alav.).xlsx`
**Aba `Orçamento` — Labels financeiros relevantes:**
- `B1`: Receita
- `T1`: Total Acumulado Ano 1
- `AG1`: Total Acumulado Ano 2
- `AT1`: Total Acumulado Ano 3
- `BG1`: Total Acumulado Ano 4
- `BT1`: Total Acumulado Ano 5
- `CG1`: Total Acumulado Ano 6
- `CH1`: Total acumulado pós custo capital
- `B5`: Resultado
- `B8`: Total Fixo + Variável
- `B10`: Custos Fixos
- `B25`: Despesas
- `B50`: Outros custos fixos
- `B53`: Custos Variáveis
- `B70`: Outros custos variáveis

**Aba `Custo investimento ` — Labels financeiros relevantes:**
- `A1`: Investimento - Unidade 3
- `A7`: Total
- `B9`: Origem do custo financeiro
- `B27`: Custo financeiro mensal (simulado)
- `B28`: Custo financeiro total do período
- `B30`: Resultado líquido projetado da unidade
- `B31`: Resultado após custo do capital

**Aba `Financiamento` — Labels financeiros relevantes:**
- `B30`: Total Parcelamento

**Aba `Água e luz` — Labels financeiros relevantes:**
- `J2`: Total
- `D6`: Energia total
- `D18`: Água total

**Aba `Cálcul. trabalhado` — Labels financeiros relevantes:**
- `I1`: Res. Mensal
- `H19`: Meta Alunos

**Aba `Cálculo kit higiene` — Labels financeiros relevantes:**
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Aba `Equipe` — Labels financeiros relevantes:**
- `J2`: Total
- `J12`: Total
- `J22`: Total
- `J32`: Total
- `J42`: Total
- `J52`: Total

**Aba `Orçamento máquinas` — Labels financeiros relevantes:**
- `M2`: Total Health
- `T36`: Valor total mínimo ~
- `T40`: total

**Aba `Cálcul. para definição benefic` — Labels financeiros relevantes:**
- `F29`: Distribuição mensal é muito dispersa
- `F31`: Média mensal de aulas dadas
- `F33`: média mensal de aulas dadas (com IC 95%)

**Aba `Benefícios Personal` — Labels financeiros relevantes:**
- `H3`: Planos e faturamento mensal 

**Aba `Benefícios aluno` — Labels financeiros relevantes:**
- `A6`: Zero mensalidade

**Aba `Concorrentes` — Labels financeiros relevantes:**
- `H11`: ~ mensalidade p/ aluno

#### `Orçamento 16.0 - Quarta unidade (Alav.).xlsx`
**Aba `Orçamento` — Labels financeiros relevantes:**
- `B1`: Receita
- `T1`: Total Acumulado Ano 1
- `AG1`: Total Acumulado Ano 2
- `AT1`: Total Acumulado Ano 3
- `BG1`: Total Acumulado Ano 4
- `BT1`: Total Acumulado Ano 5
- `CG1`: Total Acumulado Ano 6
- `CH1`: Total acumulado pós custo capital
- `B5`: Resultado
- `B8`: Total Fixo + Variável
- `B10`: Custos Fixos
- `B25`: Despesas
- `B50`: Outros custos fixos
- `B53`: Custos Variáveis
- `B70`: Outros custos variáveis

**Aba `Custo investimento ` — Labels financeiros relevantes:**
- `A1`: Investimento - Unidade 4
- `A7`: Total
- `B9`: Origem do custo financeiro
- `B27`: Custo financeiro mensal (simulado)
- `B28`: Custo financeiro total do período
- `B30`: Resultado líquido projetado da unidade
- `B31`: Resultado após custo do capital

**Aba `Financiamento` — Labels financeiros relevantes:**
- `B30`: Total Parcelamento

**Aba `Água e luz` — Labels financeiros relevantes:**
- `J2`: Total
- `D6`: Energia total
- `D18`: Água total

**Aba `Cálcul. trabalhado` — Labels financeiros relevantes:**
- `I1`: Res. Mensal
- `H19`: Meta Alunos

**Aba `Cálculo kit higiene` — Labels financeiros relevantes:**
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Aba `Equipe` — Labels financeiros relevantes:**
- `J2`: Total
- `J12`: Total
- `J22`: Total
- `J32`: Total
- `J42`: Total
- `J52`: Total

**Aba `Orçamento máquinas` — Labels financeiros relevantes:**
- `M2`: Total Health
- `T36`: Valor total mínimo ~
- `T40`: total

**Aba `Cálcul. para definição benefic` — Labels financeiros relevantes:**
- `F29`: Distribuição mensal é muito dispersa
- `F31`: Média mensal de aulas dadas
- `F33`: média mensal de aulas dadas (com IC 95%)

**Aba `Benefícios Personal` — Labels financeiros relevantes:**
- `H3`: Planos e faturamento mensal 

**Aba `Benefícios aluno` — Labels financeiros relevantes:**
- `A6`: Zero mensalidade

**Aba `Concorrentes` — Labels financeiros relevantes:**
- `H11`: ~ mensalidade p/ aluno

#### `Orçamento 16.0 - Quinta unidade (Alav.).xlsx`
**Aba `Orçamento` — Labels financeiros relevantes:**
- `B1`: Receita
- `T1`: Total Acumulado Ano 1
- `AG1`: Total Acumulado Ano 2
- `AT1`: Total Acumulado Ano 3
- `BG1`: Total Acumulado Ano 4
- `BT1`: Total Acumulado Ano 5
- `CG1`: Total Acumulado Ano 6
- `CH1`: Total acumulado pós custo capital
- `B5`: Resultado
- `B8`: Total Fixo + Variável
- `B10`: Custos Fixos
- `B25`: Despesas
- `B50`: Outros custos fixos
- `B53`: Custos Variáveis
- `B70`: Outros custos variáveis

**Aba `Custo investimento  ` — Labels financeiros relevantes:**
- `A1`: Investimento - Unidade 5
- `A7`: Total
- `B9`: Origem do custo financeiro
- `B27`: Custo financeiro mensal (simulado)
- `B28`: Custo financeiro total do período
- `B30`: Resultado líquido projetado da unidade
- `B31`: Resultado após custo do capital

**Aba `Financiamento` — Labels financeiros relevantes:**
- `B30`: Total Parcelamento

**Aba `Água e luz` — Labels financeiros relevantes:**
- `J2`: Total
- `D6`: Energia total
- `D18`: Água total

**Aba `Cálcul. trabalhado` — Labels financeiros relevantes:**
- `I1`: Res. Mensal
- `H19`: Meta Alunos

**Aba `Cálculo kit higiene` — Labels financeiros relevantes:**
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Aba `Equipe` — Labels financeiros relevantes:**
- `J2`: Total
- `J12`: Total
- `J22`: Total
- `J32`: Total
- `J42`: Total
- `J52`: Total

**Aba `Orçamento máquinas` — Labels financeiros relevantes:**
- `M2`: Total Health
- `T36`: Valor total mínimo ~
- `T40`: total

**Aba `Cálcul. para definição benefic` — Labels financeiros relevantes:**
- `F29`: Distribuição mensal é muito dispersa
- `F31`: Média mensal de aulas dadas
- `F33`: média mensal de aulas dadas (com IC 95%)

**Aba `Benefícios Personal` — Labels financeiros relevantes:**
- `H3`: Planos e faturamento mensal 

**Aba `Benefícios aluno` — Labels financeiros relevantes:**
- `A6`: Zero mensalidade

**Aba `Concorrentes` — Labels financeiros relevantes:**
- `H11`: ~ mensalidade p/ aluno

#### `Orçamento 16.0 - Sexta unidade (Alav.).xlsx`
**Aba `Orçamento` — Labels financeiros relevantes:**
- `B1`: Receita
- `T1`: Total Acumulado Ano 1
- `AG1`: Total Acumulado Ano 2
- `AT1`: Total Acumulado Ano 3
- `BG1`: Total Acumulado Ano 4
- `BT1`: Total Acumulado Ano 5
- `CG1`: Total Acumulado Ano 6
- `CH1`: Total acumulado pós custo capital
- `B5`: Resultado
- `B8`: Total Fixo + Variável
- `B10`: Custos Fixos
- `B25`: Despesas
- `B50`: Outros custos fixos
- `B53`: Custos Variáveis
- `B70`: Outros custos variáveis

**Aba `Custo investimento ` — Labels financeiros relevantes:**
- `A1`: Investimento - Unidade 6
- `A7`: Total
- `B9`: Origem do custo financeiro
- `B27`: Custo financeiro mensal (simulado)
- `B28`: Custo financeiro total do período
- `B30`: Resultado líquido projetado da unidade
- `B31`: Resultado após custo do capital

**Aba `Financiamento` — Labels financeiros relevantes:**
- `B30`: Total Parcelamento

**Aba `Água e luz` — Labels financeiros relevantes:**
- `J2`: Total
- `D6`: Energia total
- `D18`: Água total

**Aba `Cálcul. trabalhado` — Labels financeiros relevantes:**
- `I1`: Res. Mensal
- `H19`: Meta Alunos

**Aba `Cálculo kit higiene` — Labels financeiros relevantes:**
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Aba `Equipe` — Labels financeiros relevantes:**
- `J2`: Total
- `J12`: Total
- `J22`: Total
- `J32`: Total
- `J42`: Total
- `J52`: Total

**Aba `Orçamento máquinas` — Labels financeiros relevantes:**
- `M2`: Total Health
- `T36`: Valor total mínimo ~
- `T40`: total

**Aba `Cálcul. para definição benefic` — Labels financeiros relevantes:**
- `F29`: Distribuição mensal é muito dispersa
- `F31`: Média mensal de aulas dadas
- `F33`: média mensal de aulas dadas (com IC 95%)

**Aba `Benefícios Personal` — Labels financeiros relevantes:**
- `H3`: Planos e faturamento mensal 

**Aba `Benefícios aluno` — Labels financeiros relevantes:**
- `A6`: Zero mensalidade

**Aba `Concorrentes` — Labels financeiros relevantes:**
- `H11`: ~ mensalidade p/ aluno

#### `Orçamento 16.0 - Sétima unidade (Alav.).xlsx`
**Aba `Orçamento` — Labels financeiros relevantes:**
- `B1`: Receita
- `T1`: Total Acumulado Ano 1
- `AG1`: Total Acumulado Ano 2
- `AT1`: Total Acumulado Ano 3
- `BG1`: Total Acumulado Ano 4
- `BT1`: Total Acumulado Ano 5
- `CG1`: Total Acumulado Ano 6
- `CH1`: Total acumulado pós custo capital
- `B5`: Resultado
- `B8`: Total Fixo + Variável
- `B10`: Custos Fixos
- `B25`: Despesas
- `B50`: Outros custos fixos
- `B53`: Custos Variáveis
- `B70`: Outros custos variáveis

**Aba `Custo investimento  ` — Labels financeiros relevantes:**
- `A1`: Investimento - Unidade 7
- `A7`: Total
- `B9`: Origem do custo financeiro
- `B27`: Custo financeiro mensal (simulado)
- `B28`: Custo financeiro total do período
- `B30`: Resultado líquido projetado da unidade
- `B31`: Resultado após custo do capital

**Aba `Financiamento` — Labels financeiros relevantes:**
- `B30`: Total Parcelamento

**Aba `Água e luz` — Labels financeiros relevantes:**
- `J2`: Total
- `D6`: Energia total
- `D18`: Água total

**Aba `Cálcul. trabalhado` — Labels financeiros relevantes:**
- `I1`: Res. Mensal
- `H19`: Meta Alunos

**Aba `Cálculo kit higiene` — Labels financeiros relevantes:**
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Aba `Equipe` — Labels financeiros relevantes:**
- `J2`: Total
- `J12`: Total
- `J22`: Total
- `J32`: Total
- `J42`: Total
- `J52`: Total

**Aba `Orçamento máquinas` — Labels financeiros relevantes:**
- `M2`: Total Health
- `T36`: Valor total mínimo ~
- `T40`: total

**Aba `Cálcul. para definição benefic` — Labels financeiros relevantes:**
- `F29`: Distribuição mensal é muito dispersa
- `F31`: Média mensal de aulas dadas
- `F33`: média mensal de aulas dadas (com IC 95%)

**Aba `Benefícios Personal` — Labels financeiros relevantes:**
- `H3`: Planos e faturamento mensal 

**Aba `Benefícios aluno` — Labels financeiros relevantes:**
- `A6`: Zero mensalidade

**Aba `Concorrentes` — Labels financeiros relevantes:**
- `H11`: ~ mensalidade p/ aluno

#### `Orçamento 16.0 - Oitava unidade (Alav.).xlsx`
**Aba `Orçamento` — Labels financeiros relevantes:**
- `B1`: Receita
- `T1`: Total Acumulado Ano 1
- `AG1`: Total Acumulado Ano 2
- `AT1`: Total Acumulado Ano 3
- `BG1`: Total Acumulado Ano 4
- `BT1`: Total Acumulado Ano 5
- `CG1`: Total Acumulado Ano 6
- `CH1`: Total acumulado pós custo capital
- `B5`: Resultado
- `B8`: Total Fixo + Variável
- `B10`: Custos Fixos
- `B25`: Despesas
- `B50`: Outros custos fixos
- `B53`: Custos Variáveis
- `B70`: Outros custos variáveis

**Aba `Custo investimento ` — Labels financeiros relevantes:**
- `A1`: Investimento - Unidade 8
- `A7`: Total
- `B9`: Origem do custo financeiro
- `B27`: Custo financeiro mensal (simulado)
- `B28`: Custo financeiro total do período
- `B30`: Resultado líquido projetado da unidade
- `B31`: Resultado após custo do capital

**Aba `Financiamento` — Labels financeiros relevantes:**
- `B30`: Total Parcelamento

**Aba `Água e luz` — Labels financeiros relevantes:**
- `J2`: Total
- `D6`: Energia total
- `D18`: Água total

**Aba `Cálcul. trabalhado` — Labels financeiros relevantes:**
- `I1`: Res. Mensal
- `H19`: Meta Alunos

**Aba `Cálculo kit higiene` — Labels financeiros relevantes:**
- `F27`: Custo Sachês/mês
- `G27`: Custo lavagens toalh.
- `I27`: Custo total das repos.
- `J27`: Custo total/mês
- `K27`: Custo total/ano

**Aba `Equipe` — Labels financeiros relevantes:**
- `J2`: Total
- `J12`: Total
- `J22`: Total
- `J32`: Total
- `J42`: Total
- `J52`: Total

**Aba `Orçamento máquinas` — Labels financeiros relevantes:**
- `M2`: Total Health
- `T36`: Valor total mínimo ~
- `T40`: total

**Aba `Cálcul. para definição benefic` — Labels financeiros relevantes:**
- `F29`: Distribuição mensal é muito dispersa
- `F31`: Média mensal de aulas dadas
- `F33`: média mensal de aulas dadas (com IC 95%)

**Aba `Benefícios Personal` — Labels financeiros relevantes:**
- `H3`: Planos e faturamento mensal 

**Aba `Benefícios aluno` — Labels financeiros relevantes:**
- `A6`: Zero mensalidade

**Aba `Concorrentes` — Labels financeiros relevantes:**
- `H11`: ~ mensalidade p/ aluno

#### `Consolidado - 2027-2034 Alav. (oito unidades).xlsx`
**Aba `Resultado consolidado` — Labels financeiros relevantes:**
- `T1`: Total Acumulado Ano 1
- `AG1`: Total Acumulado Ano 2
- `AT1`: Total Acumulado Ano 3
- `BG1`: Total Acumulado Ano 4
- `BT1`: Total Acumulado Ano 5
- `CG1`: Total Acumulado Ano 6
- `CT1`: Total Acumulado Ano 7
- `DG1`: Total Acumulado Ano 8
- `DH1`: Total acumulado pós custo capital
- `B2`: Receita total
- `B5`: Resultado
- `B8`: Total Custo fixo + variável

**Aba `Capex Total ` — Labels financeiros relevantes:**
- `C1`: Custo mensal
- `D1`: Custo de capital até 2034
- `A10`: Resultado líquido projetado consolidado
- `A11`: Resultado após custo de capital

#### `Dashboard base.xlsx`
**Aba `Base financeira` — Labels financeiros relevantes:**
- `C1`: Receita
- `D1`: Custos fixos
- `E1`: Custos variáveis
- `F1`: Resultado operacional
- `G1`: Custos financeiros
- `H1`: Lucro líquido
- `I1`: Margem líquida

---

## 5. Inconsistências e Pontos de Atenção

Com base na análise automatizada, foram identificados os seguintes pontos:

1. **Referências externas entre arquivos** — O consolidado e o dashboard base
   provavelmente usam `[arquivo].xlsx` para buscar dados das unidades.
   Isso torna o sistema frágil a renomeações e movimentações de arquivo.
   **→ No Atlas Finance, essa lógica deve migrar para cálculo centralizado no backend.**

2. **Inputs hardcoded** — Muitos valores numéricos estocados diretamente em células
   sem rótulo claro constituem premissas financeiras críticas (taxa de crescimento,
   preço de mensalidade, mix de planos, etc.).
   **→ Devem ser mapeados para `assumption_definitions` e `assumption_values` no banco.**

3. **Nomes de abas inconsistentes** — Pequenas variações de nomenclatura entre arquivos
   de unidades diferentes (ex: 'Cálcul. trabalhado' vs 'Calculo trabalhado').
   **→ O importador deve normalizar nomes de abas via mapeamento explícito.**

4. **Fórmulas circulares potenciais** — Não detectadas automaticamente, mas o openpyxl
   não executa fórmulas; requer verificação manual no Excel.
   **→ Recomenda-se validação manual antes da migração final.**

5. **Ausência de validação de dados** — Não há proteção de célula formal detectada.
   **→ O Atlas Finance deve impor essa separação via permissões e tipos de campo.**

---

## 6. Estrutura Financeira Inferida (por aba)

Com base nos nomes de abas e labels detectados, segue o mapa financeiro inferido:

| Aba | Domínio | Tipo |
|---|---|---|
| `Orçamento` | DRE projetado (receita, custos, resultado) | Output principal |
| `Custo investimento` | CAPEX inicial | Input + Output |
| `Financiamento` | Estrutura de dívida e parcelas | Input + Output |
| `Água e luz` | Custos de utilidade (energia, água) | Input |
| `Cálcul. trabalhado` | Horas trabalhadas, carga horária | Input + Cálculo |
| `Cálculo kit higiene` | Custos de consumíveis | Input + Cálculo |
| `Equipe` | Headcount, salários, encargos | Input |
| `Orçamento máquinas` | Depreciação e manutenção de equipamentos | Input |
| `Cronograma de ativ.` | Timeline de ativação e ramp-up | Input |
| `Cálcul. para definição benefic` | Base de cálculo para benefícios | Cálculo |
| `Benefícios Personal` | Benefícios dos professores/personal | Input + Cálculo |
| `Benefícios aluno` | Benefícios/descontos para alunos | Input + Cálculo |
| `Manifesto` | Posicionamento e premissas estratégicas | Referência |
| `Concorrentes` | Análise competitiva e benchmark | Referência |
| `Local` | Premissas de localização (m², aluguel) | Input |
| `Sistema` | Premissas de sistema e tech stack interno | Referência |
| `Resultado consolidado` | DRE consolidado das 8 unidades | Output |
| `Capex Total` | CAPEX agregado de todas as unidades | Output |
| `Unidades` | Seleção e visão por unidade | Dashboard |
| `Base financeira` | Inputs base para o dashboard | Input |
| `Unit economics anual` | Métricas anuais por unidade | Output |
| `Unit economics (fixos)` | Custos fixos por unidade | Output |

---

## 7. Premissas Financeiras Críticas Identificadas

As seguintes premissas foram inferidas como centrais para o modelo financeiro:

### Receita
- Capacidade máxima de alunos por unidade
- Taxa de ocupação mensal projetada (curva de ramp-up)
- Mix de planos (mensal, trimestral, anual)
- Ticket médio por plano
- Número de personal trainers
- Receita de personal training (pacote / comissão)

### Custos Fixos
- Aluguel (valor fixo + IPTU + condomínio)
- Folha de equipe fixa
- Encargos sociais (% sobre folha)
- Sistema de gestão (mensalidade)
- Internet e telefonia
- Contabilidade e jurídico

### Custos Variáveis
- Kit higiene por aluno/mês
- Comissão de vendas (% da receita)
- Custos de manutenção de máquinas (% sobre valor)
- Energia elétrica (kWh + tarifa)
- Água (m³ + tarifa)

### CAPEX
- Valor total de equipamentos por unidade
- Obras e adaptações
- Despesas pré-operacionais
- Capital de giro inicial

### Financiamento
- Valor financiado
- Taxa de juros mensal
- Prazo (meses)
- Carência

---

## 8. Proposta de Normalização dos Inputs como `assumption_definitions`

```
CATEGORIA: RECEITA
  - alunos_capacidade_maxima       [int]     input editável, por unidade
  - taxa_ocupacao_mes_N             [float%]  input editável, por versão (12 períodos)
  - ticket_medio_plano_mensal       [R$]      input editável
  - ticket_medio_plano_trimestral   [R$]      input editável
  - ticket_medio_plano_anual        [R$]      input editável
  - mix_plano_mensal_pct            [float%]  input editável
  - mix_plano_trimestral_pct        [float%]  input editável
  - mix_plano_anual_pct             [float%]  input editável
  - num_personal_trainers           [int]     input editável
  - receita_media_personal_mes      [R$]      input editável

CATEGORIA: CUSTOS FIXOS
  - aluguel_mensal                  [R$]      input editável
  - condominio_mensal               [R$]      input editável
  - iptu_mensal                     [R$]      input editável
  - folha_equipe_fixa               [R$]      input editável
  - encargos_folha_pct              [float%]  input editável
  - sistema_gestao_mensal           [R$]      input editável
  - internet_telefonia_mensal       [R$]      input editável
  - contabilidade_juridico_mensal   [R$]      input editável

CATEGORIA: CUSTOS VARIÁVEIS
  - kit_higiene_por_aluno           [R$]      input editável
  - comissao_vendas_pct             [float%]  input editável
  - manutencao_maquinas_pct         [float%]  input editável (% do valor)
  - kwh_consumo_mensal              [float]   input editável
  - tarifa_kwh                      [R$]      input editável
  - consumo_agua_m3_mensal          [float]   input editável
  - tarifa_agua_m3                  [R$]      input editável

CATEGORIA: CAPEX
  - valor_equipamentos              [R$]      input editável
  - custo_obras_adaptacoes          [R$]      input editável
  - despesas_preoperacionais        [R$]      input editável
  - capital_giro_inicial            [R$]      input editável

CATEGORIA: FINANCIAMENTO
  - valor_financiado                [R$]      input editável
  - taxa_juros_mensal               [float%]  input editável
  - prazo_meses                     [int]     input editável
  - carencia_meses                  [int]     input editável
```

---

## 9. Conclusões e Recomendações

1. **A estrutura financeira é uniforme entre as unidades** — Todas as planilhas
   de unidade seguem o mesmo template, o que valida a viabilidade de um motor
   financeiro parametrizado único.

2. **O consolidado é uma agregação simples** — Somas de receitas e custos por
   período, sem lógica complexa. Pode ser inteiramente reproduzido no backend.

3. **O dashboard usa os consolidados como fonte** — É um layer de apresentação
   sobre os dados já calculados. Migração direta para o frontend Atlas Finance.

4. **Prioridade de migração:**
   - Fase A: Migrar inputs da aba `Orçamento` e `Local`
   - Fase B: Migrar cálculos de custo fixo e variável
   - Fase C: Migrar CAPEX e financiamento
   - Fase D: Migrar equipe e benefícios
   - Fase E: Validar consolidado vs. memória de cálculo original

---

_Relatório gerado automaticamente pelo script `scripts/reverse_engineer.py`._
_Revisão manual recomendada para os pontos de atenção identificados._