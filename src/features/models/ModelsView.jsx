import Button from '@mui/material/Button'
import { FileCheck2, Plus } from 'lucide-react'

export function ModelsView({ setCreateOpen }) {
  return <section className="subpage"><div className="page-title-row"><div><h1>Modelos</h1><p>Estruturas reutilizáveis para deixar sua próxima proposta mais rápida.</p></div></div><section className="feature-note"><span><FileCheck2 size={18} /></span><div><strong>Modelos reutilizáveis estão em preparação</strong><p>Esta função ainda não está conectada ao banco. Enquanto isso, crie uma proposta completa e reutilize sua estrutura como referência.</p></div><Button className="btn-secondary" onClick={() => setCreateOpen(true)}><Plus size={15} /> Criar proposta</Button></section></section>
}

