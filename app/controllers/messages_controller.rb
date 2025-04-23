require 'http'

class MessagesController < ApplicationController
  def create
    @chat_thread = ChatThread.find(params[:chat_thread_id])
    @message = @chat_thread.messages.build(message_params)

    response = openai_api_call(@message.prompt)

    if response.status.success?
      response_body = JSON.parse(response.body)
      @message.response = response_body['choices'][0]['message']['content']

      if @chat_thread.messages.count == 0
        generated_title = generate_title(@message.prompt)
        @chat_thread.update(title: generated_title)
      end

      if @message.save
        render json: {
          response: @message.response,
          thread_title: @chat_thread.title
        }
      else
        render json: { error: @message.errors.full_messages.join(', ') }, status: :unprocessable_entity
      end
    else
      render json: { error: 'APIリクエストが失敗しました' }, status: :unprocessable_entity
    end
  end

  private

  def message_params
    params.require(:message).permit(:prompt)
  end

  def openai_api_call(prompt)
    HTTP.post(
      'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type' => 'application/json',
        'Authorization' => "Bearer #{ENV['OPENAI_API_KEY']}"
      },
      json: {
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }]
      }
    )
  end

  def generate_title(content)
    title_prompt = "以下の会話の開始プロンプトから、この会話スレッドの内容を予測し、5単語以内の簡潔なタイトルを生成してください。タイトルは今後の会話も含めてスレッドの内容を想像できるものにしてください。\n\nプロンプト: #{content}\n\nタイトル:"

    response = openai_api_call(title_prompt)
    if response.status.success?
      response_body = JSON.parse(response.body.to_s)
      generated_title = response_body['choices'][0]['message']['content'].strip
      return generated_title
    else
      return "新しい会話スレッド"
    end
  end
end