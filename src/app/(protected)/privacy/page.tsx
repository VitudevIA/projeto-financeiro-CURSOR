import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Política de Privacidade</h1>
        <p className="text-gray-600 mt-2">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Informações que Coletamos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            Coletamos as seguintes informações quando você usa nosso serviço:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li><strong>Informações de conta:</strong> Nome, email, senha (criptografada)</li>
            <li><strong>Dados financeiros:</strong> Transações, cartões, categorias, orçamentos</li>
            <li><strong>Dados de uso:</strong> Como você interage com a plataforma</li>
            <li><strong>Dados técnicos:</strong> Endereço IP, tipo de navegador, sistema operacional</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Como Usamos suas Informações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            Utilizamos suas informações para:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Fornecer e manter nosso serviço</li>
            <li>Processar suas transações financeiras</li>
            <li>Gerar insights e relatórios personalizados</li>
            <li>Melhorar a funcionalidade da plataforma</li>
            <li>Comunicar atualizações e novidades</li>
            <li>Cumprir obrigações legais</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Compartilhamento de Informações</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, exceto:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-gray-700">
            <li>Com seu consentimento explícito</li>
            <li>Para cumprir obrigações legais</li>
            <li>Para proteger nossos direitos e segurança</li>
            <li>Com prestadores de serviços que nos ajudam a operar a plataforma (sob acordos de confidencialidade)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Segurança dos Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-gray-700">
            <li>Criptografia de dados em trânsito e em repouso</li>
            <li>Controle de acesso baseado em funções</li>
            <li>Monitoramento de segurança 24/7</li>
            <li>Backups regulares e seguros</li>
            <li>Treinamento de equipe em proteção de dados</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Seus Direitos (LGPD)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">
            De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem os seguintes direitos:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li><strong>Acesso:</strong> Solicitar informações sobre seus dados pessoais</li>
            <li><strong>Correção:</strong> Corrigir dados incompletos ou incorretos</li>
            <li><strong>Exclusão:</strong> Solicitar a exclusão de seus dados</li>
            <li><strong>Portabilidade:</strong> Exportar seus dados em formato legível</li>
            <li><strong>Revogação:</strong> Retirar seu consentimento a qualquer momento</li>
            <li><strong>Oposição:</strong> Opor-se ao tratamento de seus dados</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>6. Retenção de Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Mantemos seus dados pessoais apenas pelo tempo necessário para cumprir os propósitos descritos nesta política, 
            ou conforme exigido por lei. Quando você exclui sua conta, seus dados são removidos de nossos sistemas 
            dentro de 30 dias.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>7. Cookies e Tecnologias Similares</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Utilizamos cookies e tecnologias similares para melhorar sua experiência, lembrar suas preferências e 
            analisar o uso da plataforma. Você pode controlar o uso de cookies através das configurações do seu navegador.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>8. Alterações na Política</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas 
            através do serviço ou por email. Recomendamos revisar esta política regularmente.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>9. Contato e DPO</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato conosco através dos 
            canais disponíveis na plataforma. Nomeamos um Encarregado de Proteção de Dados (DPO) para garantir o 
            cumprimento da LGPD.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
