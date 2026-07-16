import {
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  MapPin,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/types'

export interface ItemNavegacao {
  rotulo: string
  para: string
  icone: LucideIcon
  /** Perfis que enxergam o item — e que a rota também aceita. */
  roles: Role[]
}

/**
 * Fonte única da navegação: alimenta o menu da sidebar E as permissões das
 * rotas. Se fossem duas listas, um item some do menu mas a URL continua
 * acessível — ou o contrário.
 *
 * Os perfis espelham o escopo do backend (`services/visita.py`).
 */
export const NAVEGACAO: ItemNavegacao[] = [
  {
    rotulo: 'Dashboard',
    para: '/dashboard',
    icone: LayoutDashboard,
    // Todos têm dashboard; o backend já recorta os números por perfil.
    roles: ['ADMIN', 'GESTOR_COMERCIAL', 'TECNICO_EXTERNO', 'TECNICO_INTERNO'],
  },
  {
    rotulo: 'Chamados',
    para: '/chamados',
    icone: ClipboardList,
    roles: ['ADMIN', 'GESTOR_COMERCIAL'],
  },
  {
    rotulo: 'Minhas visitas',
    para: '/visitas',
    icone: MapPin,
    roles: ['TECNICO_EXTERNO'],
  },
  {
    rotulo: 'Relatórios',
    para: '/relatorios',
    icone: FileText,
    roles: ['ADMIN', 'TECNICO_INTERNO'],
  },
  {
    rotulo: 'Clientes',
    para: '/clientes',
    icone: Building2,
    roles: ['ADMIN', 'GESTOR_COMERCIAL'],
  },
  {
    rotulo: 'Usuários',
    para: '/usuarios',
    icone: Users,
    roles: ['ADMIN'],
  },
  {
    rotulo: 'Unidades',
    para: '/unidades',
    icone: UsersRound,
    roles: ['ADMIN'],
  },
]

export function itensPara(role: Role | undefined): ItemNavegacao[] {
  if (!role) return []
  return NAVEGACAO.filter((item) => item.roles.includes(role))
}

/** Para onde mandar o usuário depois do login: o primeiro item do menu dele. */
export function rotaInicial(role: Role | undefined): string {
  return itensPara(role)[0]?.para ?? '/dashboard'
}

export const ROTULO_ROLE: Record<Role, string> = {
  ADMIN: 'Administrador',
  GESTOR_COMERCIAL: 'Gestor Comercial',
  TECNICO_EXTERNO: 'Técnico Externo',
  TECNICO_INTERNO: 'Técnico Interno',
}
