import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Termos de Uso</h1>
        <p className="text-gray-600 mt-2">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Aceitação dos Termos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Ao utilizar o Sistema de Gestão Financeira Pessoal, você concorda em cumprir e estar vinculado a estes Termos de Uso. 
            Se você não concordar com qualquer parte destes termos, não deve utilizar nosso serviço.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Descrição do Serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Nosso serviço oferece uma plataforma para gestão financeira pessoal, incluindo:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-gray-700">
            <li>Registro e categorização de transações financeiras</li>
            <li>Controle de orçamentos por categoria</li>
            <li>Dashboard com visualizações e insights</li>
            <li>Importação de dados de planilhas</li>
            <li>Exportação de relatórios</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Uso Aceitável</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            Você concorda em usar nosso serviço apenas para fins legais e de acordo com estes termos. Você não deve:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Usar o serviço para atividades ilegais ou não autorizadas</li>
            <li>Tentar acessar contas de outros usuários</li>
            <li>Interferir no funcionamento do serviço</li>
            <li>Usar o serviço para transmitir malware ou código malicioso</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Privacidade e Proteção de Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Levamos a privacidade e proteção dos seus dados muito a sério. Nossa coleta, uso e proteção de dados pessoais 
            são regidos por nossa Política de Privacidade, que faz parte integrante destes Termos de Uso.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Limitação de Responsabilidade</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            O serviço é fornecido "como está" e "conforme disponível". Não garantimos que o serviço será ininterrupto, 
            livre de erros ou que atenderá às suas necessidades específicas. Nossa responsabilidade é limitada ao máximo 
            permitido por lei.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Modificações dos Termos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entrarão em vigor 
            imediatamente após a publicação. Seu uso continuado do serviço constitui aceitação dos termos modificados.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7. Contato</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco através dos canais disponíveis 
            na plataforma.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
