import type { ReactNode } from 'react'
import './App.css'

function Logo() {
  return (
    <svg className="logo-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M24 4 8 12v10c0 11 7 19 16 22 9-3 16-11 16-22V12L24 4Z"
        fill="currentColor"
        opacity=".15"
      />
      <path
        d="M24 8 12 14v8c0 8.5 5.4 14.9 12 17.6C30.6 36.9 36 30.5 36 22v-8L24 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
      />
      <circle cx="24" cy="21" r="5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="24" cy="21" r="1.6" fill="currentColor" />
    </svg>
  )
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    inventory: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <path d="M14 14l7 7M14 21l7-7" />
      </>
    ),
    cart: (
      <>
        <circle cx="9" cy="21" r="1.8" />
        <circle cx="18" cy="21" r="1.8" />
        <path d="M2.5 3.5h3l2.7 12.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 2-1.6L22.5 7H6" />
      </>
    ),
    move: (
      <>
        <path d="M4 12h13M13 7l5 5-5 5" />
        <path d="M14 12h6M15 8l5 4-5 4" />
      </>
    ),
    tag: (
      <>
        <path d="M20.6 5.6 12 5a1 1 0 0 0-1 1l.6 8.6a1 1 0 0 0 .3.7l9.5 9.5a1 1 0 0 0 1.4 0l8-8a1 1 0 0 0 0-1.4L21.3 5.9a1 1 0 0 0-.7-.3Z" />
        <circle cx="15.5" cy="10.5" r="1.6" />
      </>
    ),
    money: (
      <>
        <rect x="2.5" y="6" width="19" height="13" rx="2" />
        <path d="M16.5 12.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path d="M2.5 10.5h2M19.5 14.5h2" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 15l4-5 3 3 5-7" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8.5" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <circle cx="17.5" cy="9.5" r="2.8" />
        <path d="M15 14.6a6.5 6.5 0 0 1 6.5 5.4" />
      </>
    ),
    warehouse: (
      <>
        <path d="M3 21V9l9-5 9 5v12" />
        <path d="M8 21v-6h8v6M3 21h18" />
      </>
    ),
    store: (
      <>
        <path d="M3 9l1.5-5h15L21 9" />
        <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
        <path d="M5 12v9h14v-9" />
        <path d="M9 21v-5h6v5" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="M3 17l5-4 4 3 3-2 6 5" />
      </>
    ),
    bell: (
      <>
        <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2.5h-15L6 16Z" />
        <path d="M10 21a2 2 0 0 0 4 0" />
      </>
    ),
    check: <path d="M4 12.5l5 5L20 6.5" />,
    arrow: (
      <>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </>
    ),
  }
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

const features = [
  {
    icon: 'inventory',
    title: 'Inventario centralizado',
    text: 'Control total de productos, stock por ubicación y alertas de reposición automática en 4 almacenes y 3 tiendas.',
  },
  {
    icon: 'cart',
    title: 'Ventas rápidas',
    text: 'Busque por código, marca o modelo, agregue productos y registre pagos en efectivo, QR, transferencia o crédito.',
  },
  {
    icon: 'move',
    title: 'Movimientos entre ubicaciones',
    text: 'Registre ingresos, salidas y traslados de mercadería entre almacenes y tiendas con trazabilidad completa.',
  },
  {
    icon: 'tag',
    title: 'Precios y costos',
    text: 'Calcule precios a partir del costo con porcentajes de margen y actualice el inventario desde las facturas.',
  },
  {
    icon: 'chart',
    title: 'Reportes y dashboard',
    text: 'Ventas del día, mes, por tienda, por marca y reportes por proveedor para tomar decisiones informadas.',
  },
  {
    icon: 'image',
    title: 'Búsqueda por imagen',
    text: 'Fotografíe o suba una imagen del repuesto y el sistema buscará coincidencias en la base de datos.',
  },
]

const modules = [
  'Dashboard',
  'Inventario',
  'Ventas',
  'Ventas por mayor',
  'Movimientos',
  'Precios',
  'Costos',
  'Devoluciones',
  'Solicitudes a almacén',
  'Reportes',
  'Facturación',
  'Configuración',
]

const roles = [
  {
    icon: 'users',
    title: 'Administrador',
    color: '#22d3ee',
    items: [
      'Acceso completo al sistema',
      'Gestión de productos y precios',
      'Costos y facturas',
      'Ventas por mayor',
      'Reportes y configuración',
    ],
  },
  {
    icon: 'store',
    title: 'Usuario de tienda',
    color: '#60a5fa',
    items: [
      'Venta y consulta de stock',
      'Registro de pagos y facturas',
      'Devoluciones',
      'Solicitudes a almacén',
    ],
  },
  {
    icon: 'warehouse',
    title: 'Encargado de inventario',
    color: '#818cf8',
    items: [
      'Recibir solicitudes de tiendas',
      'Registrar ingresos y salidas',
      'Movimientos entre ubicaciones',
      'Corroborar mercadería recibida',
    ],
  },
]

const steps = [
  {
    n: '1',
    icon: 'inventory',
    title: 'Inventario',
    text: 'Productos, stock y ubicaciones siempre actualizados.',
  },
  {
    n: '2',
    icon: 'cart',
    title: 'Ventas',
    text: 'Ventas de mostrador y por mayor con pagos múltiples.',
  },
  {
    n: '3',
    icon: 'move',
    title: 'Movimientos',
    text: 'Traslados fluidos entre almacenes y tiendas.',
  },
  {
    n: '4',
    icon: 'tag',
    title: 'Precios y costos',
    text: 'Costos controlados y precios calculados con margen.',
  },
  {
    n: '5',
    icon: 'chart',
    title: 'Reportes',
    text: 'Información clara para decidir mejor.',
  },
]

function App() {
  return (
    <>
      <header className="site-header">
        <nav className="nav container" aria-label="Navegación principal">
          <a href="#inicio" className="brand">
            <Logo />
            <span>AutoRepuestos <em>Pro</em></span>
          </a>
          <div className="nav-links">
            <a href="#caracteristicas">Características</a>
            <a href="#modulos">Módulos</a>
            <a href="#roles">Roles</a>
            <a href="#flujo">Flujo</a>
          </div>
          <a href="#contacto" className="btn btn-primary">Iniciar sesión</a>
        </nav>
      </header>

      <main>
        <section id="inicio" className="hero section">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="badge">Sistema de Inventario y Ventas</span>
              <h1>Repuestos automotrices bajo <span className="accent">control total</span></h1>
              <p className="lead">
                Administre el inventario, realice ventas, controle los costos y genere reportes
                de toda su operación de repuestos y accesorios para vehículos, desde la tienda
                hasta el almacén.
              </p>
              <div className="hero-actions">
                <a href="#contacto" className="btn btn-primary btn-lg">
                  Comenzar ahora <Icon name="arrow" />
                </a>
                <a href="#modulos" className="btn btn-ghost btn-lg">Explorar módulos</a>
              </div>
              <dl className="hero-stats">
                <div>
                  <dt>4</dt>
                  <dd>Almacenes</dd>
                </div>
                <div>
                  <dt>3</dt>
                  <dd>Tiendas</dd>
                </div>
                <div>
                  <dt>3</dt>
                  <dd>Roles de usuario</dd>
                </div>
                <div>
                  <dt>24/7</dt>
                  <dd>Disponibilidad</dd>
                </div>
              </dl>
            </div>
            <div className="hero-visual" aria-hidden="true">
              <div className="screen">
                <div className="screen-bar">
                  <span />
                  <span />
                  <span />
                  <em>Inventario</em>
                </div>
                <div className="screen-body">
                  <div className="search-row"><span /> <i>Buscar producto…</i></div>
                  <div className="table">
                    <div className="thead"><span>Producto</span><span>Marca</span><span>Stock</span><span>Precio</span></div>
                    <div className="trow"><span>Parachoque</span><span>Toyota</span><b>24</b><em>Bs 1.450</em></div>
                    <div className="trow"><span>Filtro de aceite</span><span>Nissan</span><b>0</b><em>Bs 95</em></div>
                    <div className="trow"><span>Pastillas de freno</span><span>Mazda</span><b>18</b><em>Bs 320</em></div>
                    <div className="trow"><span>Amortiguador</span><span>Hyundai</span><b>9</b><em>Bs 780</em></div>
                  </div>
                  <div className="stats-row">
                    <div><b>182</b><span>Productos</span></div>
                    <div><b>Bs 96k</b><span>Ventas del mes</span></div>
                    <div><b>4</b><span>Solicitudes</span></div>
                  </div>
                </div>
              </div>
              <div className="floating-card card-a">
                <Icon name="bell" />
                <div><b>Reposición automática</b><span>Stock bajo en Tienda 1</span></div>
              </div>
              <div className="floating-card card-b">
                <Icon name="check" />
                <div><b>Venta registrada</b><span>Bs 1.450 · Efectivo</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="caracteristicas" className="section">
          <div className="container">
            <div className="section-head">
              <h2>Todo lo que su negocio necesita</h2>
              <p>
                Una plataforma integral que conecta inventario, ventas, almacenes, tiendas
                y reportes en un solo lugar.
              </p>
            </div>
            <div className="cards-grid">
              {features.map((f) => (
                <article className="card" key={f.title}>
                  <span className="card-icon"><Icon name={f.icon} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="modulos" className="section section-alt">
          <div className="container">
            <div className="section-head">
              <h2>Módulos del sistema</h2>
              <p>Pantallas diseñadas para cada parte del proceso de venta de repuestos.</p>
            </div>
            <ul className="modules-list">
              {modules.map((m) => (
                <li key={m}>
                  <Icon name="check" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="roles" className="section">
          <div className="container">
            <div className="section-head">
              <h2>Permisos por rol</h2>
              <p>Cada usuario ve exactamente lo que necesita para su trabajo.</p>
            </div>
            <div className="roles-grid">
              {roles.map((r) => (
                <article className="role-card" key={r.title}>
                  <span className="role-icon" style={{ color: r.color }}>
                    <Icon name={r.icon} />
                  </span>
                  <h3>{r.title}</h3>
                  <ul>
                    {r.items.map((item) => (
                      <li key={item}>
                        <Icon name="check" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="flujo" className="section section-alt">
          <div className="container">
            <div className="section-head">
              <h2>Un proceso conectado de principio a fin</h2>
              <p>Desde la llegada de la mercadería hasta el reporte final, todo fluye.</p>
            </div>
            <div className="flow">
              {steps.map((s, i) => (
                <div className="flow-step" key={s.n}>
                  <div className="flow-node">
                    <span className="flow-num">{s.n}</span>
                    <Icon name={s.icon} />
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  {i < steps.length - 1 && <span className="flow-arrow" aria-hidden="true" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contacto" className="cta section">
          <div className="container cta-inner">
            <h2>¿Listo para optimizar su operación?</h2>
            <p>
              Únase a nuestro sistema y transforme la forma en que gestiona su inventario
              y sus ventas de repuestos.
            </p>
            <a href="#inicio" className="btn btn-primary btn-lg">Solicitar acceso</a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <a href="#inicio" className="brand brand-footer">
              <Logo />
              <span>AutoRepuestos <em>Pro</em></span>
            </a>
            <p>Sistema de inventario y ventas para la comercialización de repuestos y accesorios de vehículos.</p>
          </div>
          <div>
            <h4>Plataforma</h4>
            <a href="#caracteristicas">Características</a>
            <a href="#modulos">Módulos</a>
            <a href="#roles">Roles</a>
          </div>
          <div>
            <h4>Recursos</h4>
            <a href="#flujo">Flujo del sistema</a>
            <a href="#contacto">Contacto</a>
            <a href="#inicio">Inicio</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} AutoRepuestos Pro. Proyecto académico de Programación Avanzada.</span>
        </div>
      </footer>
    </>
  )
}

export default App