import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import MuiMenu from '@mui/material/Menu'
import TextField from '@mui/material/TextField'
import { ArrowRight, ArrowUpDown, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight, Filter, LifeBuoy, Plus, Search } from 'lucide-react'

export function ProposalListView({
  matchingProposals, proposals, query, setQuery, sort, setSort, filter, setFilter,
  filterAnchor, setFilterAnchor, filterOpen, dataLoading, ProposalTable, setSelected,
  setCreateOpen, setView, setMobileNav, notify, EmptyState,
}) {
  const statusOptions = ['Todas','Rascunho','Pronta para envio','Enviada','Visualizada','Em negociação','Aceita','Expirada']
  return <>
    <div className="page-title-row"><div><Button className="back-link" onClick={() => setView('inicio')}><ChevronLeft size={14} /> Visão geral</Button><h1>Propostas</h1><p>Todas as oportunidades, do primeiro rascunho ao aceite.</p></div><Button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={17} /> Nova proposta</Button></div>
    <div className="list-panel panel"><div className="list-toolbar"><div className="list-count"><strong>{matchingProposals.length.toString().padStart(2, '0')}</strong> propostas <span>·</span> organize e encontre com facilidade</div><div className="list-tools"><div className="search-field"><TextField id="proposal-search" variant="standard" size="small" hiddenLabel value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente ou proposta" slotProps={{ input: { disableUnderline: true, startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment>, endAdornment: <InputAdornment position="end"><kbd>Ctrl K</kbd></InputAdornment> }, htmlInput: { 'aria-label': 'Buscar propostas' } }} /></div><Button className="btn-secondary btn-compact sort-control" onClick={() => setSort((current) => current === 'recentes' ? 'validade' : current === 'validade' ? 'valor' : 'recentes')} title="Alterar ordenação"><ArrowUpDown size={14} /> {sort === 'recentes' ? 'Recentes' : sort === 'validade' ? 'Validade' : 'Maior valor'}</Button><div className="filter-wrap"><Button className={'btn-secondary btn-compact' + (filter !== 'Todas' ? ' filter-selected' : '')} onClick={(event) => setFilterAnchor(event.currentTarget)}><Filter size={14} /> {filter === 'Todas' ? 'Filtrar' : filter} <ChevronDown size={13} /></Button><MuiMenu anchorEl={filterAnchor} open={filterOpen} onClose={() => setFilterAnchor(null)}>{statusOptions.map((value) => <MenuItem key={value} selected={filter === value} onClick={() => { setFilter(value); setFilterAnchor(null) }}>{value}{filter === value && <Check size={14} />}</MenuItem>)}</MuiMenu></div></div></div>
      {dataLoading ? <div className="dashboard-empty" role="status"><CircularProgress size={17} /> Carregando propostas do Supabase...</div> : matchingProposals.length ? <><div className="table-scroll"><ProposalTable proposals={matchingProposals} onOpen={setSelected} full /></div><div className="list-footer"><span>Exibindo <strong>{matchingProposals.length}</strong> de <strong>{proposals.length}</strong> propostas</span><span><Button disabled aria-label="Página anterior"><ChevronLeft size={15} /></Button><b>1</b><Button disabled aria-label="Próxima página"><ChevronRight size={15} /></Button></span></div></> : <EmptyState search={query || filter !== 'Todas'} onCreate={() => setCreateOpen(true)} onReset={() => { setQuery(''); setFilter('Todas'); setSort('recentes') }} />}
    </div>
    <div className="help-strip"><span><LifeBuoy size={16} /></span><div><strong>Quer uma proposta que seja fácil de decidir?</strong><small>Use um escopo claro, mostre o valor e deixe o próximo passo evidente.</small></div><Button className="text-action" onClick={() => notify('Uma estrutura simples: contexto, resultado esperado, entregáveis, investimento, validade e próximo passo.')}>Ver boas práticas <ArrowUpRight size={14} /></Button></div>
  </>
}

