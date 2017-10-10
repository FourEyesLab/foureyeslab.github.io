require 'json'

module Enumerable
  def stable_sort
    each_with_index.sort { |(x, i), (y, j)|
      r = yield(x, y)
      r == 0 ? i <=> j : r
    }.map(&:first)
  end
end

module FourEyes
  module StableSortFilter
    def json(object)
      object.reject {|k,v| k == "collections" }.to_json
    end

    def stable_sort(input, property = nil)
      ary = [input].flatten
      ary.stable_sort do |a, b|
        a = a[property]
        b = b[property]
        if a && b
          a <=> b
        else
          a == b ? 0 : a ? -1 : 1
        end
      end
    end
  end
end

Liquid::Template.register_filter(FourEyes::StableSortFilter)
